const CACHE_NAME = "auto-aac-shell-v1";
const SHELL_CACHE_PREFIX = "auto-aac-shell-";
const OFFLINE_URL = "/offline.html";
const OPTIONAL_PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.add(OFFLINE_URL);
      await Promise.allSettled(
        OPTIONAL_PRECACHE_URLS.map((url) => cache.add(url)),
      );
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(SHELL_CACHE_PREFIX) &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  );
});

function emergencyOfflineResponse() {
  return new Response(
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인 | Auto AAC</title></head><body><main><h1>인터넷 연결이 필요합니다</h1><p>AAC 카드 생성은 온라인에서만 사용할 수 있습니다.</p></main></body></html>',
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

async function offlineResponse() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch {
    // A deterministic response below keeps navigation usable without storage.
  }

  return emergencyOfflineResponse();
}

function hasExpectedContentType(pathname, contentType) {
  const mimeType = contentType.split(";", 1)[0].trim().toLowerCase();

  if (pathname.startsWith("/icons/")) {
    return mimeType.startsWith("image/");
  }

  const extension = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
  const javascriptTypes = [
    "application/javascript",
    "application/x-javascript",
    "text/javascript",
  ];

  if (extension === ".js" || extension === ".mjs") {
    return javascriptTypes.includes(mimeType);
  }
  if (extension === ".css") {
    return mimeType === "text/css";
  }
  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico"].includes(
      extension,
    )
  ) {
    return mimeType.startsWith("image/");
  }
  if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(extension)) {
    return (
      mimeType.startsWith("font/") ||
      mimeType === "application/font-woff" ||
      mimeType === "application/vnd.ms-fontobject"
    );
  }
  if (extension === ".wasm") {
    return mimeType === "application/wasm";
  }
  if (extension === ".json" || extension === ".map") {
    return mimeType === "application/json";
  }

  return false;
}

function canCacheRuntimeResponse(requestUrl, response) {
  if (
    response.status !== 200 ||
    response.redirected ||
    !["basic", "default"].includes(response.type)
  ) {
    return false;
  }

  let responseUrl;
  try {
    responseUrl = new URL(response.url);
  } catch {
    return false;
  }

  return (
    responseUrl.origin === self.location.origin &&
    responseUrl.pathname === requestUrl.pathname &&
    hasExpectedContentType(
      requestUrl.pathname,
      response.headers.get("content-type") || "",
    )
  );
}

async function cacheFirstAsset(request, requestUrl) {
  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch {
    // Cache storage is an optional optimization; continue with the network.
  }

  const networkResponse = await fetch(request);
  if (cache && canCacheRuntimeResponse(requestUrl, networkResponse)) {
    try {
      await cache.put(request, networkResponse.clone());
    } catch {
      // Quota and storage errors must not discard a successful response.
    }
  }

  return networkResponse;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname === "/privacy" ||
    url.pathname.startsWith("/privacy/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => offlineResponse()),
    );
    return;
  }

  const isCacheableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/");

  if (!isCacheableAsset) {
    return;
  }

  event.respondWith(
    cacheFirstAsset(request, url),
  );
});
