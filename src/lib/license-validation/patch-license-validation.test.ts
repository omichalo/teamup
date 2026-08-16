import {
  isLicenseValidationStatus,
  normalizeLicenseValidationStatus,
  requiresFfttLicenseNumber,
  resolveLicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationPatchInput } from "@/lib/license-validation/patch-license-validation";
import {
  LICENSE_REQUIRED_MESSAGE,
  resolveLicenseValidationPatchFields,
} from "@/lib/license-validation/resolve-license-validation-patch";

const EDITABLE_FIELDS: Array<keyof LicenseValidationPatchInput> = [
  "ffttLicense",
  "licenseValidationStatus",
];

const BASE_RESOLVE = {
  currentLicense: null as string | null,
  currentLookupLicense: null as string | null,
  currentStatus: "to_do" as const,
};

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
    expect(isLicenseValidationStatus("validated_without_sport")).toBe(true);
    expect(isLicenseValidationStatus("other_federation")).toBe(true);
  });

  it("exige le numéro de licence pour Traité et Validé sans pratique sportive", () => {
    expect(requiresFfttLicenseNumber("done")).toBe(true);
    expect(requiresFfttLicenseNumber("validated_without_sport")).toBe(true);
    expect(requiresFfttLicenseNumber("to_do")).toBe(false);
    expect(requiresFfttLicenseNumber("other_federation")).toBe(false);
  });

  it("resolves list filters safely", () => {
    expect(resolveLicenseValidationListFilter("done")).toBe("done");
    expect(
      resolveLicenseValidationListFilter("validated_without_sport")
    ).toBe("validated_without_sport");
    expect(resolveLicenseValidationListFilter("unknown")).toBe("all");
    expect(resolveLicenseValidationListFilter(null)).toBe("all");
  });
});

describe("resolveLicenseValidationPatchFields", () => {
  it("autorise un statut sans licence hors Traité et Validé sans pratique sportive", () => {
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "to_do",
        hasStatus: true,
      })
    ).toEqual({
      ok: true,
      fields: { ffttLicense: null, licenseValidationStatus: "to_do" },
    });
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "other_federation",
        hasStatus: true,
        currentLookupLicense: "9876543",
      })
    ).toEqual({
      ok: true,
      fields: {
        ffttLicense: null,
        licenseValidationStatus: "other_federation",
      },
    });
  });

  it("refuse Traité ou Validé sans pratique sportive sans numéro de licence", () => {
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "done",
        hasStatus: true,
      })
    ).toEqual({ ok: false, error: LICENSE_REQUIRED_MESSAGE });
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "validated_without_sport",
        hasStatus: true,
      })
    ).toEqual({ ok: false, error: LICENSE_REQUIRED_MESSAGE });
  });

  it("accepte Traité ou Validé sans pratique sportive avec un numéro valide", () => {
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "1234567",
        hasLicense: true,
        bodyStatus: "done",
        hasStatus: true,
      })
    ).toEqual({
      ok: true,
      fields: { ffttLicense: "1234567", licenseValidationStatus: "done" },
    });
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "1234567",
        hasLicense: true,
        bodyStatus: "validated_without_sport",
        hasStatus: true,
      })
    ).toEqual({
      ok: true,
      fields: {
        ffttLicense: "1234567",
        licenseValidationStatus: "validated_without_sport",
      },
    });
  });

  it("reprend la licence déjà connue si le champ est vide", () => {
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "done",
        hasStatus: true,
        currentLookupLicense: "9876543",
      })
    ).toEqual({
      ok: true,
      fields: { ffttLicense: "9876543", licenseValidationStatus: "done" },
    });
    expect(
      resolveLicenseValidationPatchFields({
        ...BASE_RESOLVE,
        bodyLicense: "",
        hasLicense: true,
        bodyStatus: "validated_without_sport",
        hasStatus: true,
        currentLookupLicense: "9876543",
      })
    ).toEqual({
      ok: true,
      fields: {
        ffttLicense: "9876543",
        licenseValidationStatus: "validated_without_sport",
      },
    });
  });
});
