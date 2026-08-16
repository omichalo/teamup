import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import { isAdultAt, isAtLeast65At, isMinorAt } from "@/lib/club-registration/age";

/**
 * Date de référence des tranches d’âge club / FFTT : 1er septembre
 * de la première année de `meta.seasonLabel` (ex. 2025-2026 → 2025-09-01).
 * Aligné sur `pricingDate` des tests tarifaires.
 */
export const CLUB_SEASON_AGE_MONTH = 9;
export const CLUB_SEASON_AGE_DAY = 1;

const SEASON_LABEL_RE = /^(\d{4})\s*[-/]\s*(\d{2,4})$/;

function localNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Parse « 2025-2026 » / « 2025/26 » → 1er septembre de l’année de début. */
export function parseSeasonAgeReferenceDate(seasonLabel: string): Date | null {
  const match = SEASON_LABEL_RE.exec(seasonLabel.trim());
  if (!match) {
    return null;
  }
  const startYear = Number.parseInt(match[1], 10);
  if (!Number.isFinite(startYear) || startYear < 2000 || startYear > 2100) {
    return null;
  }
  return localNoon(startYear, CLUB_SEASON_AGE_MONTH, CLUB_SEASON_AGE_DAY);
}

export function getClubSeasonAgeReferenceDate(seasonLabel?: string): Date {
  const label = seasonLabel?.trim()
    ? seasonLabel
    : getDefaultRegistrationConfig().meta.seasonLabel;
  return (
    parseSeasonAgeReferenceDate(label) ??
    localNoon(2025, CLUB_SEASON_AGE_MONTH, CLUB_SEASON_AGE_DAY)
  );
}

export function isMinorForClubSeason(
  birthDate: string,
  seasonLabel?: string
): boolean {
  return isMinorAt(birthDate, getClubSeasonAgeReferenceDate(seasonLabel));
}

export function isAtLeast65ForClubSeason(
  birthDate: string,
  seasonLabel?: string
): boolean {
  return isAtLeast65At(birthDate, getClubSeasonAgeReferenceDate(seasonLabel));
}

export function isAdultPpsEligibleForClubSeason(
  birthDate: string,
  seasonLabel?: string
): boolean {
  const at = getClubSeasonAgeReferenceDate(seasonLabel);
  return isAdultAt(birthDate, at) && !isAtLeast65At(birthDate, at);
}
