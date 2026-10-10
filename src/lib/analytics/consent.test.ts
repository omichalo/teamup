import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearAnalyticsConsent,
  hasAnalyticsConsentGranted,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./consent";

describe("analytics consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("retourne unset quand aucune préférence n’est stockée", () => {
    expect(readAnalyticsConsent()).toBe("unset");
    expect(hasAnalyticsConsentGranted()).toBe(false);
  });

  it("persiste granted", () => {
    writeAnalyticsConsent("granted");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe(
      "granted"
    );
    expect(readAnalyticsConsent()).toBe("granted");
    expect(hasAnalyticsConsentGranted()).toBe(true);
  });

  it("persiste denied", () => {
    writeAnalyticsConsent("denied");
    expect(readAnalyticsConsent()).toBe("denied");
    expect(hasAnalyticsConsentGranted()).toBe(false);
  });

  it("clearAnalyticsConsent remet le statut à unset", () => {
    writeAnalyticsConsent("granted");
    clearAnalyticsConsent();
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull();
    expect(readAnalyticsConsent()).toBe("unset");
  });

  it("ignore une valeur localStorage invalide", () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "maybe");
    expect(readAnalyticsConsent()).toBe("unset");
  });
});
