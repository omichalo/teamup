import { registrationMatchesLicenseValidationSearch } from "@/lib/license-validation/search-registrations";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";

function baseItem(
  overrides: Partial<LicenseValidationListItem> = {}
): LicenseValidationListItem {
  return {
    id: "reg_1",
    firstName: "Jean",
    lastName: "Dupont",
    adherentEmail: "jean.dupont@example.com",
    birthDate: "2010-05-01",
    ffttLicense: "1234567",
    licenseValidationStatus: "to_do",
    wantsCompetitorExtras: false,
    paymentStatus: "pending_validation",
    status: "submitted",
    submittedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("registrationMatchesLicenseValidationSearch", () => {
  it("matches by name tokens", () => {
    expect(registrationMatchesLicenseValidationSearch(baseItem(), "dupont jean")).toBe(
      true
    );
    expect(registrationMatchesLicenseValidationSearch(baseItem(), "martin")).toBe(false);
  });

  it("matches by license number", () => {
    expect(registrationMatchesLicenseValidationSearch(baseItem(), "1234567")).toBe(true);
    expect(registrationMatchesLicenseValidationSearch(baseItem(), "4567")).toBe(true);
  });

  it("returns true for short queries", () => {
    expect(registrationMatchesLicenseValidationSearch(baseItem(), "j")).toBe(true);
  });
});
