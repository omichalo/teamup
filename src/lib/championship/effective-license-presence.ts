import { resolveLicensePresence } from "./license-presence";
import type { LicensePresence } from "./records";

export type LicensePresenceMirrorInput = {
  ffttLicense?: string | null;
  listedInClub?: boolean | null;
  typeLicence?: string | null;
  licenseValidationStatus?: string | null;
  playerNomClub?: string | null;
};

/**
 * Présence licence effective : le miroir FFTT prime sur une valeur roster périmée
 * (ex. défaut API `"unknown"` alors que `listedInClub` est vrai).
 */
export function effectiveLicensePresence(
  stored: LicensePresence | null | undefined,
  mirror: LicensePresenceMirrorInput | null | undefined
): LicensePresence {
  if (!mirror) {
    return stored ?? "unknown";
  }
  const hasMirrorSignal =
    mirror.listedInClub === true ||
    mirror.listedInClub === false ||
    Boolean((mirror.typeLicence ?? "").trim()) ||
    Boolean((mirror.playerNomClub ?? "").trim()) ||
    Boolean((mirror.ffttLicense ?? "").replace(/\D/g, ""));

  if (!hasMirrorSignal) {
    return stored ?? "unknown";
  }

  return resolveLicensePresence({
    ffttLicense: mirror.ffttLicense ?? null,
    listedInClub: mirror.listedInClub ?? null,
    typeLicence: mirror.typeLicence ?? null,
    licenseValidationStatus: mirror.licenseValidationStatus ?? null,
    playerNomClub: mirror.playerNomClub ?? null,
  });
}
