"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  hasAnalyticsConsentGranted,
  readAnalyticsConsent,
} from "./consent";
import {
  initFirebaseAnalytics,
  logAnalyticsPageView,
  resetFirebaseAnalyticsInstance,
} from "./firebase-analytics";

/**
 * Envoie page_view à chaque navigation App Router, uniquement si consentement granted.
 */
export function usePageViews(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const syncFromConsent = () => {
      const status = readAnalyticsConsent();
      if (status !== "granted") {
        resetFirebaseAnalyticsInstance();
      }
    };
    syncFromConsent();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncFromConsent);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncFromConsent);
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (!hasAnalyticsConsentGranted()) return;

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    void (async () => {
      await initFirebaseAnalytics();
      await logAnalyticsPageView(pagePath);
    })();
  }, [pathname, searchParams]);
}
