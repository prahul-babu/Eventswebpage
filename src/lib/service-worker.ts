/**
 * Service Worker Registration for Offline Shell Caching
 */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.info("[SW] Registered offline shell successfully with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registration note:", err);
        });
    });
  }
}
