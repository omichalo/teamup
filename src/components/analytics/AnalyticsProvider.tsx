"use client";

import { Suspense } from "react";
import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";
import { AnalyticsPageViews } from "./AnalyticsPageViews";

/**
 * Point d’entrée analytics : bandeau de consentement + page views (si accord).
 */
export function AnalyticsProvider() {
  return (
    <>
      <AnalyticsConsentBanner />
      <Suspense fallback={null}>
        <AnalyticsPageViews />
      </Suspense>
    </>
  );
}
