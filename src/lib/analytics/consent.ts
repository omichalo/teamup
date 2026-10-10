export type AnalyticsConsentStatus = "granted" | "denied" | "unset";

export const ANALYTICS_CONSENT_STORAGE_KEY = "teamup_analytics_consent";

/** Événement DOM pour synchroniser bandeau / page views après changement de choix. */
export const ANALYTICS_CONSENT_CHANGE_EVENT = "teamup-analytics-consent-change";

const GRANTED = "granted";
const DENIED = "denied";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readAnalyticsConsent(): AnalyticsConsentStatus {
  if (!isBrowser()) return "unset";
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (raw === GRANTED) return "granted";
    if (raw === DENIED) return "denied";
    return "unset";
  } catch {
    return "unset";
  }
}

export function writeAnalyticsConsent(value: "granted" | "denied"): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  } catch {
    // Quota / mode privé : on ignore, le bandeau pourra réapparaître.
  }
  dispatchConsentChange();
}

/** Efface le choix (ex. « Gérer les cookies ») pour réafficher le bandeau. */
export function clearAnalyticsConsent(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }
  dispatchConsentChange();
}

export function hasAnalyticsConsentGranted(): boolean {
  return readAnalyticsConsent() === "granted";
}

function dispatchConsentChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGE_EVENT));
}
