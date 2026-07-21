import {
  isLicenseValidationStatus,
  normalizeLicenseValidationStatus,
  resolveLicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationPatchInput } from "@/lib/license-validation/patch-license-validation";

const EDITABLE_FIELDS: Array<keyof LicenseValidationPatchInput> = [
  "ffttLicense",
  "licenseValidationStatus",
];

describe("license validation patch constraints", () => {
  it("only exposes ffttLicense and licenseValidationStatus as editable fields", () => {
    expect(EDITABLE_FIELDS).toEqual(["ffttLicense", "licenseValidationStatus"]);
  });

  it("normalizes unknown statuses to to_do", () => {
    expect(normalizeLicenseValidationStatus(undefined)).toBe("to_do");
    expect(normalizeLicenseValidationStatus("invalid")).toBe("to_do");
  });

  it("accepts known statuses", () => {
    expect(isLicenseValidationStatus("done")).toBe(true);
    expect(isLicenseValidationStatus("other_federation")).toBe(true);
  });

  it("resolves list filters safely", () => {
    expect(resolveLicenseValidationListFilter("done")).toBe("done");
    expect(resolveLicenseValidationListFilter("unknown")).toBe("all");
    expect(resolveLicenseValidationListFilter(null)).toBe("all");
  });
});
