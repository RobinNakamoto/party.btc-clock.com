const CACHE_VERSION = "v2"; // Updated from v1 to v2
const CACHE_NAME = "btc-clock-" + CACHE_VERSION;

const PRECACHE = [
  "/",
  "index.html",
  "manifest.json",
  "icons/apple-touch-icon.png",
  "icons/apple-touch-icon-60x60.png",
  "icons/apple-touch-icon-76x76.png",
  "icons/apple-touch-icon-120x120.png",
  "icons/apple-touch-icon-152x152.png",
  "icons/apple-touch-icon-180x180.png",
  "icons/android-chrome-192x192.png",
  "icons/android-chrome-512x512.png",
  "icons/favicon-32x32.png",
  "icons/favicon-16x16.png",
  "icons/favicon.ico",
  "icons/safari-pinned-tab.svg",
  "icons/browserconfig.xml"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => (n.startsWith("btc-clock-") && n !== CACHE_NAME) ? caches.delete(n) : null));
    await self.clients.claim();
  })());
});

// Do not cache HLS playlists or segments
function isStreamRequest(req) {
  const u = new URL(req.url);
  const p = u.pathname;
  return p.includes("/live") || p.includes("/seg") || p.endsWith(".m3u8") || p.endsWith(".ts");
}

self.addEventListener("fetch", event => {
  const { request } = event;

  if (isStreamRequest(request)) {
    // always go to network for video stream
    event.respondWith(fetch(request));
    return;
  }

  // cache first for precached files, then network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(resp => {
        // optionally cache GET requests
        if (request.method === "GET" && resp.ok && resp.type === "basic") {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return resp;
      });
    })
  );
});
