import { ChampionshipType } from "@/types";
import { isSeasonLabel } from "@/lib/championship/calendar-season-label";

export function getAvailabilityDocumentId(
  seasonLabel: string,
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  const season = seasonLabel.trim();
  if (!isSeasonLabel(season)) {
    throw new Error(`Libellé de saison invalide pour disponibilité: ${seasonLabel}`);
  }
  if (idEpreuve !== undefined) {
    return `${season}_${phase}_${journee}_${championshipType}_${idEpreuve}`;
  }
  return `${season}_${phase}_${journee}_${championshipType}`;
}

/** ID legacy (sans saison) — migration / fallback sondages Discord déjà lancés. */
export function getLegacyAvailabilityDocumentId(
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  if (idEpreuve !== undefined) {
    return `${phase}_${journee}_${championshipType}_${idEpreuve}`;
  }
  return `${phase}_${journee}_${championshipType}`;
}

const SEASON_PREFIX_RE = /^(\d{4}-\d{4})_(.+)$/;

export function stripSeasonPrefixFromAvailabilityDocId(
  docId: string
): { seasonLabel: string | null; legacyId: string } {
  const match = SEASON_PREFIX_RE.exec(docId);
  if (!match || !isSeasonLabel(match[1])) {
    return { seasonLabel: null, legacyId: docId };
  }
  return { seasonLabel: match[1], legacyId: match[2] };
}
