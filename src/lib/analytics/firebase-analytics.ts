import type { Analytics } from "firebase/analytics";
import { getFirebaseApp, getFirebaseMeasurementId } from "@/lib/firebase";
import { hasAnalyticsConsentGranted } from "./consent";

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

function debugLog(...args: unknown[]): void {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEBUG === "true"
  ) {
    console.log("[analytics]", ...args);
  }
}

/**
 * Initialise Firebase Analytics uniquement si consentement accordé et measurementId présent.
 * No-op (null) sinon — ne charge pas le SDK.
 */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!hasAnalyticsConsentGranted()) {
    debugLog("skip init: consent not granted");
    return null;
  }
  const measurementId = getFirebaseMeasurementId();
  if (!measurementId) {
    debugLog("skip init: missing measurementId");
    return null;
  }
  if (analyticsInstance) return analyticsInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { getAnalytics, isSupported } = await import("firebase/analytics");
      const supported = await isSupported();
      if (!supported) {
        debugLog("skip init: analytics not supported in this environment");
        return null;
      }
      const app = getFirebaseApp();
      analyticsInstance = getAnalytics(app);
      debugLog("initialized", { measurementId });
      return analyticsInstance;
    } catch (error) {
      debugLog("init failed", error);
      analyticsInstance = null;
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function isFirebaseAnalyticsReady(): boolean {
  return analyticsInstance !== null;
}

/** Remet l’instance à null (refus ou reset consentement) — n’efface pas les cookies GA déjà posés. */
export function resetFirebaseAnalyticsInstance(): void {
  analyticsInstance = null;
  initPromise = null;
}

/**
 * Envoie un page_view si Analytics est prêt et consentement toujours valide.
 */
export async function logAnalyticsPageView(pagePath: string): Promise<void> {
  if (!hasAnalyticsConsentGranted()) return;
  const analytics = analyticsInstance ?? (await initFirebaseAnalytics());
  if (!analytics) return;

  const { logEvent } = await import("firebase/analytics");
  const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const eventParams: {
    page_path: string;
    page_location: string;
    page_title?: string;
  } = {
    page_path: path,
    page_location: window.location.href,
  };
  if (document.title) {
    eventParams.page_title = document.title;
  }
  logEvent(analytics, "page_view", eventParams);
  debugLog("page_view", path);
}
