import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from "firebase/app-check";
import { app } from "./firebase";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

let appCheckInstance: AppCheck | null = null;

/**
 * Initializes Firebase App Check only if explicitly enabled in environment.
 */
export function initAppCheck(): AppCheck | null {
  if (typeof window === "undefined") return null;

  const isEnabled = import.meta.env.VITE_ENABLE_APPCHECK === "true";
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;

  if (!isEnabled || !siteKey) {
    return null;
  }

  if (import.meta.env.DEV || import.meta.env.VITE_APPCHECK_DEBUG === "true") {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }

  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.info("[App Check] Firebase App Check initialized successfully.");
  } catch (err: any) {
    console.warn("[App Check] Initialization note:", err.message);
  }

  return appCheckInstance;
}
