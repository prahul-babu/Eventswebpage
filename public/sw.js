// Service Worker: Clean & Auto-Bust Stale Caches
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Always fetch fresh content from the network
  event.respondWith(fetch(event.request));
});
