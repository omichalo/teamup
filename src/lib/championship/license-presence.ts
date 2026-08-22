import { isPlayableLicenseType } from "@/lib/players/current-club-license";
import type { LicensePresence } from "./records";

export type LicensePresenceInput = {
  ffttLicense?: string | null;
  listedInClub?: boolean | null;
  typeLicence?: string | null;
  licenseValidationStatus?: string | null;
  playerNomClub?: string | null;
};

const SQY_CLUB_NAME_RE = /sqy\s*ping/i;

export function resolveLicensePresence(input: LicensePresenceInput): LicensePresence {
  const license = (input.ffttLicense ?? "").replace(/\D/g, "");
  if (!license) {
    return "none";
  }
  if (input.licenseValidationStatus === "other_federation") {
    return "other_federation";
  }
  if (input.listedInClub === true) {
    return isPlayableLicenseType(input.typeLicence)
      ? "in_club_list"
      : "fftt_sqy_unlicensed";
  }
  const nomClub = input.playerNomClub ?? "";
  const stillSqy = SQY_CLUB_NAME_RE.test(nomClub);
  if (nomClub.trim() && !stillSqy) {
    return "other_club";
  }
  // Last-season T/P/A leftover on a SQY affiliation is not a current club licence.
  if (input.listedInClub === false) {
    return "fftt_sqy_unlicensed";
  }
  if (stillSqy && (input.typeLicence ?? "").trim() === "") {
    return "fftt_sqy_unlicensed";
  }
  return "unknown";
}
