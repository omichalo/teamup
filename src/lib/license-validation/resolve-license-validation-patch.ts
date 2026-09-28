import {
  isLicenseValidationStatus,
  normalizeLicenseValidationStatus,
  requiresFfttLicenseNumber,
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";
import {
  FFTT_LICENSE_FORMAT_MESSAGE,
  isValidFfttLicenseNumber,
} from "@/lib/fftt/license-number";

export { isValidFfttLicenseNumber } from "@/lib/fftt/license-number";

export const LICENSE_REQUIRED_MESSAGE =
  "Le numéro de licence est obligatoire pour les statuts Traité et Validé sans pratique sportive";

export function getLicenseValidationInputError(
  value: string,
  status: LicenseValidationStatus
): string | null {
  const license = value.trim();
  if (!license) {
    return requiresFfttLicenseNumber(status) ? LICENSE_REQUIRED_MESSAGE : null;
  }
  return isValidFfttLicenseNumber(license) ? null : FFTT_LICENSE_FORMAT_MESSAGE;
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
      error: FFTT_LICENSE_FORMAT_MESSAGE,
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
