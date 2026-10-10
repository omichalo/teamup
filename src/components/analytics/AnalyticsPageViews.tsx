"use client";

import { usePageViews } from "@/lib/analytics/usePageViews";

/** Isolé pour pouvoir le placer sous Suspense (useSearchParams). */
export function AnalyticsPageViews() {
  usePageViews();
  return null;
}
