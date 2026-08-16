function licenseDigits(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value)).replace(/\D/g, "");
  }
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\D/g, "");
}

/** Numéro déjà connu : champ saisi, sinon licence du lookup FFTT. */
export function resolveKnownFfttLicenseNumber(
  ffttLicense: unknown,
  lookupLicence: unknown
): string {
  const stored = licenseDigits(ffttLicense);
  if (stored.length > 0) {
    return stored;
  }
  return licenseDigits(lookupLicence);
}

/**
 * Champ présent (même vide) = saisie secrétariat, on ne reprend pas le lookup.
 * Champ absent = jamais saisi, on peut préremplir depuis le lookup FFTT.
 */
export function readKnownFfttLicenseFromRegistrationData(
  data: Record<string, unknown>
): string | null {
  if (Object.prototype.hasOwnProperty.call(data, "ffttLicense")) {
    const stored = licenseDigits(data.ffttLicense);
    return stored.length > 0 ? stored : null;
  }
  const lookup =
    data.ffttLicenseLookup && typeof data.ffttLicenseLookup === "object"
      ? (data.ffttLicenseLookup as Record<string, unknown>).licence
      : undefined;
  const fromLookup = licenseDigits(lookup);
  return fromLookup.length > 0 ? fromLookup : null;
}
