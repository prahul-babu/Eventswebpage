/**
 * Service Worker Cache Buster: Automatically purges stale service workers & caches
 */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    // Clear all existing caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Unregister legacy service workers if any
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
