import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkerEvent = {
  request?: Request;
  respondWith: ReturnType<typeof vi.fn>;
  waitUntil: ReturnType<typeof vi.fn>;
};

type WorkerHarness = {
  cache: {
    addAll: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  caches: {
    delete: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  };
  dispatch: (type: string, event?: Partial<WorkerEvent>) => WorkerEvent;
  fetch: ReturnType<typeof vi.fn>;
};

const root = process.cwd();

async function createWorkerHarness(): Promise<WorkerHarness> {
  const source = await readFile(path.join(root, "public", "sw.js"), "utf8");
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(cache),
  };
  const fetch = vi.fn().mockResolvedValue(new Response("network"));
  const self = {
    addEventListener: (type: string, listener: (event: WorkerEvent) => void) => {
      listeners.set(type, listener);
    },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    location: { origin: "https://auto-aac.test" },
    skipWaiting: vi.fn(),
  };

  vm.runInNewContext(source, {
    URL,
    caches,
    fetch,
    Promise,
    self,
  });

  return {
    cache,
    caches,
    dispatch(type, overrides = {}) {
      const event: WorkerEvent = {
        respondWith: vi.fn(),
        waitUntil: vi.fn(),
        ...overrides,
      };
      const listener = listeners.get(type);
      expect(listener, `${type} listener`).toBeTypeOf("function");
      listener?.(event);
      return event;
    },
    fetch,
  };
}

function request(pathname: string, init?: RequestInit): Request {
  return new Request(`https://auto-aac.test${pathname}`, init);
}

describe("privacy-safe service worker", () => {
  let worker: WorkerHarness;

  beforeEach(async () => {
    worker = await createWorkerHarness();
  });

  it("precaches only the offline page, manifest, and three generated icons", async () => {
    const event = worker.dispatch("install");
    await event.waitUntil.mock.calls[0][0];

    expect(worker.cache.addAll).toHaveBeenCalledWith([
      "/offline.html",
      "/manifest.webmanifest",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
    ]);
  });

  it("does not intercept non-GET requests", () => {
    const event = worker.dispatch("fetch", {
      request: request("/api/generate", { method: "POST" }),
    });

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("does not intercept cross-origin requests", () => {
    const event = worker.dispatch("fetch", {
      request: new Request("https://example.com/image.png"),
    });

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it.each(["/api/generate", "/api/regenerate-image", "/privacy", "/privacy/"])(
    "does not intercept protected path %s",
    (pathname) => {
      const event = worker.dispatch("fetch", { request: request(pathname) });

      expect(event.respondWith).not.toHaveBeenCalled();
    },
  );

  it.each(["/_next/static/chunks/app.js", "/icons/icon-192.png"])(
    "uses cache-first only for allowlisted runtime asset %s",
    async (pathname) => {
      const event = worker.dispatch("fetch", { request: request(pathname) });
      expect(event.respondWith).toHaveBeenCalledOnce();

      await event.respondWith.mock.calls[0][0];
      expect(worker.cache.put).toHaveBeenCalledOnce();
    },
  );

  it.each(["/", "/lesson", "/offline.html", "/manifest.webmanifest"])(
    "does not runtime-cache non-asset path %s",
    async (pathname) => {
      const event = worker.dispatch("fetch", { request: request(pathname) });

      expect(event.respondWith).not.toHaveBeenCalled();
      expect(worker.cache.put).not.toHaveBeenCalled();
    },
  );

  it("uses network-first navigation with the offline page as failure fallback", async () => {
    const offline = new Response("offline");
    worker.fetch.mockRejectedValueOnce(new Error("offline"));
    worker.caches.match.mockResolvedValueOnce(offline);
    const navigation = request("/lesson");
    Object.defineProperty(navigation, "mode", { value: "navigate" });

    const event = worker.dispatch("fetch", { request: navigation });
    const response = await event.respondWith.mock.calls[0][0];

    expect(worker.fetch).toHaveBeenCalledWith(navigation);
    expect(worker.caches.match).toHaveBeenCalledWith("/offline.html");
    expect(response).toBe(offline);
    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it("removes old Auto AAC shell cache versions during activation", async () => {
    worker.caches.keys.mockResolvedValueOnce([
      "auto-aac-shell-v0",
      "auto-aac-shell-v1",
      "other-app-cache",
    ]);

    const event = worker.dispatch("activate");
    await event.waitUntil.mock.calls[0][0];

    expect(worker.caches.delete).toHaveBeenCalledTimes(1);
    expect(worker.caches.delete).toHaveBeenCalledWith("auto-aac-shell-v0");
  });
});

describe("offline shell integration", () => {
  it("provides a standalone Korean retry page", async () => {
    const html = await readFile(path.join(root, "public", "offline.html"), "utf8");

    expect(html).toContain("인터넷 연결이 필요합니다");
    expect(html).toContain("온라인");
    expect(html).toContain("다시 시도");
    expect(html).toContain("location.reload()");
    expect(html).toMatch(/<style>[\s\S]+<\/style>/);
    expect(html).toMatch(/<script>[\s\S]+<\/script>/);
    expect(html).not.toMatch(/<(?:link|script)[^>]+src=/);
  });

  it("registers the worker in production from the global layout", async () => {
    const component = await readFile(
      path.join(root, "components", "ServiceWorkerRegistration.tsx"),
      "utf8",
    );
    const layout = await readFile(path.join(root, "app", "layout.tsx"), "utf8");

    expect(component).toContain('"use client"');
    expect(component).toContain("useEffect");
    expect(component).toContain('process.env.NODE_ENV !== "production"');
    expect(component).toContain('navigator.serviceWorker.register("/sw.js")');
    expect(component).toMatch(/return null/);
    expect(layout).toContain("<ServiceWorkerRegistration />");
  });
});
