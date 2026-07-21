import { matchesLicenseStatusFilter } from "@/lib/license-validation/list-license-validations";
import { normalizeLicenseValidationStatus } from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";

function item(
  overrides: Partial<LicenseValidationListItem> = {}
): LicenseValidationListItem {
  return {
    id: "reg_1",
    firstName: "Ada",
    lastName: "Lovelace",
    adherentEmail: "ada@example.com",
    birthDate: null,
    ffttLicense: null,
    licenseValidationStatus: "to_do",
    wantsCompetitorExtras: false,
    paymentStatus: null,
    status: "submitted",
    submittedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("matchesLicenseStatusFilter", () => {
  it("treats normalized missing status as to_do", () => {
    const legacy = item({
      licenseValidationStatus: normalizeLicenseValidationStatus(undefined),
    });
    expect(legacy.licenseValidationStatus).toBe("to_do");
    expect(matchesLicenseStatusFilter(legacy, "to_do")).toBe(true);
    expect(matchesLicenseStatusFilter(legacy, "done")).toBe(false);
    expect(matchesLicenseStatusFilter(legacy, "all")).toBe(true);
  });
});
