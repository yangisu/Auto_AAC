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
    add: ReturnType<typeof vi.fn>;
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
  lifecycle: {
    claim: ReturnType<typeof vi.fn>;
    skipWaiting: ReturnType<typeof vi.fn>;
  };
};

const root = process.cwd();

function networkResponse(
  pathname: string,
  overrides: {
    contentType?: string;
    redirected?: boolean;
    status?: number;
    type?: string;
    url?: string;
  } = {},
): Response {
  const contentType =
    overrides.contentType ??
    (pathname.endsWith(".png") ? "image/png" : "application/javascript");
  const status = overrides.status ?? 200;
  const response = new Response(status === 204 ? null : "network", {
    headers: { "content-type": contentType },
    status,
  });
  Object.defineProperties(response, {
    redirected: { value: overrides.redirected ?? false },
    type: { value: overrides.type ?? "basic" },
    url: { value: overrides.url ?? `https://auto-aac.test${pathname}` },
  });
  return response;
}

async function createWorkerHarness(): Promise<WorkerHarness> {
  const source = await readFile(path.join(root, "public", "sw.js"), "utf8");
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(cache),
  };
  const fetch = vi.fn().mockImplementation((requested: Request) => {
    const pathname = new URL(requested.url).pathname;
    return Promise.resolve(networkResponse(pathname));
  });
  const claim = vi.fn().mockResolvedValue(undefined);
  const skipWaiting = vi.fn();
  const self = {
    addEventListener: (type: string, listener: (event: WorkerEvent) => void) => {
      listeners.set(type, listener);
    },
    clients: { claim },
    location: { origin: "https://auto-aac.test" },
    skipWaiting,
  };

  vm.runInNewContext(source, {
    Response,
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
    lifecycle: { claim, skipWaiting },
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

  it("precaches the essential offline page and only the optional shell assets", async () => {
    const event = worker.dispatch("install");
    await event.waitUntil.mock.calls[0][0];

    expect(worker.cache.add.mock.calls.map(([url]) => url)).toEqual([
      "/offline.html",
      "/manifest.webmanifest",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
    ]);
  });

  it("does not force a waiting worker to activate or claim existing clients", async () => {
    const install = worker.dispatch("install");
    await install.waitUntil.mock.calls[0][0];
    const activate = worker.dispatch("activate");
    await activate.waitUntil.mock.calls[0][0];

    expect(worker.lifecycle.skipWaiting).not.toHaveBeenCalled();
    expect(worker.lifecycle.claim).not.toHaveBeenCalled();
  });

  it("allows optional precache failures without failing installation", async () => {
    worker.cache.add.mockImplementation((url: string) =>
      url === "/manifest.webmanifest"
        ? Promise.reject(new Error("missing optional asset"))
        : Promise.resolve(undefined),
    );

    const event = worker.dispatch("install");

    await expect(event.waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    expect(worker.cache.add).toHaveBeenCalledTimes(5);
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

      const response = await event.respondWith.mock.calls[0][0];
      expect(await response.text()).toBe("network");
      expect(worker.cache.put).toHaveBeenCalledOnce();
    },
  );

  it.each(["open", "match"])(
    "returns the network static asset when the cache %s operation fails",
    async (operation) => {
      if (operation === "open") {
        worker.caches.open.mockRejectedValueOnce(new Error("storage disabled"));
      } else {
        worker.cache.match.mockRejectedValueOnce(new Error("cache read failed"));
      }

      const asset = request("/_next/static/chunks/app.js");
      const event = worker.dispatch("fetch", { request: asset });
      const response = await event.respondWith.mock.calls[0][0];

      expect(worker.fetch).toHaveBeenCalledWith(asset);
      expect(await response.text()).toBe("network");
    },
  );

  it("returns a successful network static asset when cache storage is full", async () => {
    worker.cache.put.mockRejectedValueOnce(new Error("quota exceeded"));
    const asset = request("/_next/static/chunks/app.js");

    const event = worker.dispatch("fetch", { request: asset });
    const response = await event.respondWith.mock.calls[0][0];

    expect(await response.text()).toBe("network");
  });

  it.each([
    ["redirected", { redirected: true }],
    ["HTML content", { contentType: "text/html" }],
    ["cross-origin final URL", { url: "https://example.com/app.js" }],
    ["different final path", { url: "https://auto-aac.test/login" }],
    ["non-200 status", { status: 204 }],
    ["CORS response type", { type: "cors" }],
  ])("does not cache a %s static response", async (_label, overrides) => {
    worker.fetch.mockResolvedValueOnce(
      networkResponse("/_next/static/chunks/app.js", overrides),
    );

    const event = worker.dispatch("fetch", {
      request: request("/_next/static/chunks/app.js"),
    });
    await event.respondWith.mock.calls[0][0];

    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it("does not cache a non-image response under the icon path", async () => {
    worker.fetch.mockResolvedValueOnce(
      networkResponse("/icons/icon-192.png", {
        contentType: "application/javascript",
      }),
    );

    const event = worker.dispatch("fetch", {
      request: request("/icons/icon-192.png"),
    });
    await event.respondWith.mock.calls[0][0];

    expect(worker.cache.put).not.toHaveBeenCalled();
  });

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
    worker.cache.match.mockResolvedValueOnce(offline);
    const navigation = request("/lesson");
    Object.defineProperty(navigation, "mode", { value: "navigate" });

    const event = worker.dispatch("fetch", { request: navigation });
    const response = await event.respondWith.mock.calls[0][0];

    expect(worker.fetch).toHaveBeenCalledWith(navigation);
    expect(worker.caches.open).toHaveBeenCalledWith("auto-aac-shell-v1");
    expect(worker.cache.match).toHaveBeenCalledWith("/offline.html");
    expect(worker.caches.match).not.toHaveBeenCalled();
    expect(response).toBe(offline);
    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it.each(["missing", "read failure"])(
    "returns a deterministic 503 document when the offline fallback is %s",
    async (failure) => {
      worker.fetch.mockRejectedValueOnce(new Error("offline"));
      if (failure === "read failure") {
        worker.cache.match.mockRejectedValueOnce(new Error("cache unavailable"));
      }
      const navigation = request("/lesson");
      Object.defineProperty(navigation, "mode", { value: "navigate" });

      const event = worker.dispatch("fetch", { request: navigation });
      const response = await event.respondWith.mock.calls[0][0];

      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("인터넷 연결이 필요합니다");
      expect(worker.caches.match).not.toHaveBeenCalled();
    },
  );

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
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("outline: 3px solid #7a3e00");
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
