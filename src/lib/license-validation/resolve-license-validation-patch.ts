import {
  isLicenseValidationStatus,
  normalizeLicenseValidationStatus,
  requiresFfttLicenseNumber,
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";

const FFTT_LICENSE_RE = /^[0-9]{5,12}$/;

export const LICENSE_REQUIRED_MESSAGE =
  "Le numéro de licence est obligatoire pour les statuts Traité et Validé sans pratique sportive";

export function isValidFfttLicenseNumber(value: string): boolean {
  return FFTT_LICENSE_RE.test(value);
}

export function parseOptionalFfttLicenseInput(
  value: unknown
): { ok: true; license: string | null } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Numéro de licence invalide" };
  }
  const normalized = value.replace(/\D/g, "");
  if (normalized.length === 0) {
    return { ok: true, license: null };
  }
  if (!isValidFfttLicenseNumber(normalized)) {
    return {
      ok: false,
      error: "Le numéro de licence doit contenir entre 5 et 12 chiffres",
    };
  }
  return { ok: true, license: normalized };
}

function firstValidLicense(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (candidate && isValidFfttLicenseNumber(candidate)) {
      return candidate;
    }
  }
  return null;
}

export type LicenseValidationPatchFields = {
  ffttLicense?: string | null;
  licenseValidationStatus?: LicenseValidationStatus;
};

export function resolveLicenseValidationPatchFields(params: {
  bodyLicense: unknown;
  hasLicense: boolean;
  bodyStatus: unknown;
  hasStatus: boolean;
  currentLicense: string | null;
  currentLookupLicense: string | null;
  currentStatus: LicenseValidationStatus;
}):
  | { ok: true; fields: LicenseValidationPatchFields }
  | { ok: false; error: string } {
  if (!params.hasLicense && !params.hasStatus) {
    return { ok: false, error: "Aucun champ modifiable fourni" };
  }

  const fields: LicenseValidationPatchFields = {};

  if (params.hasStatus) {
    if (!isLicenseValidationStatus(params.bodyStatus)) {
      return { ok: false, error: "Statut de licence invalide" };
    }
    fields.licenseValidationStatus = params.bodyStatus;
  }

  if (params.hasLicense) {
    const parsed = parseOptionalFfttLicenseInput(params.bodyLicense);
    if (!parsed.ok) {
      return parsed;
    }
    fields.ffttLicense = parsed.license;
  }

  const nextStatus =
    fields.licenseValidationStatus ??
    normalizeLicenseValidationStatus(params.currentStatus);
  const storedLicense = firstValidLicense(
    params.currentLicense,
    params.currentLookupLicense
  );

  if (fields.ffttLicense === null) {
    if (requiresFfttLicenseNumber(nextStatus)) {
      if (!storedLicense) {
        return { ok: false, error: LICENSE_REQUIRED_MESSAGE };
      }
      fields.ffttLicense = storedLicense;
    }
  } else if (
    fields.ffttLicense === undefined &&
    requiresFfttLicenseNumber(nextStatus) &&
    !storedLicense
  ) {
    return { ok: false, error: LICENSE_REQUIRED_MESSAGE };
  }

  return { ok: true, fields };
}
