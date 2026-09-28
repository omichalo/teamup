/** Single FFTT licence-number format for API, forms and roster identifiers. Keep as a string. */
export const FFTT_LICENSE_RE = /^[0-9]{4,12}$/;

export const FFTT_LICENSE_FORMAT_MESSAGE =
  "Le numéro de licence doit contenir entre 4 et 12 chiffres";

export function isValidFfttLicenseNumber(value: string): boolean {
  return FFTT_LICENSE_RE.test(value);
}
