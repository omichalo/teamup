import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { isValidFfttLicenseNumber } from "@/lib/fftt/license-number";

export function registrationMatchesLicenseValidationSearch(
  item: LicenseValidationListItem,
  rawQuery: string
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) {
    return true;
  }

  const licenseDigits = q.replace(/\D/g, "");
  if (isValidFfttLicenseNumber(licenseDigits)) {
    const storedLicense = (item.ffttLicense ?? "").replace(/\D/g, "");
    if (storedLicense.includes(licenseDigits)) {
      return true;
    }
  }

  const haystack = [
    item.firstName,
    item.lastName,
    item.adherentEmail,
    item.ffttLicense,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}
