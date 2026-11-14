import { ChampionshipType } from "@/types";
import { isSeasonLabel } from "@/lib/championship/calendar-season-label";

export function getCompositionDocumentId(
  seasonLabel: string,
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  const season = seasonLabel.trim();
  if (!isSeasonLabel(season)) {
    throw new Error(`Libellé de saison invalide pour composition: ${seasonLabel}`);
  }
  if (idEpreuve !== undefined) {
    return `${season}_${phase}_${journee}_${championshipType}_${idEpreuve}`;
  }
  return `${season}_${phase}_${journee}_${championshipType}`;
}

/** ID legacy (sans saison) — migration / lecture historique. */
export function getLegacyCompositionDocumentId(
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

export function getCompositionDefaultsDocumentId(
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  if (idEpreuve !== undefined) {
    return `${phase}_${championshipType}_${idEpreuve}`;
  }
  return `${phase}_${championshipType}`;
}

const SEASON_PREFIX_RE = /^(\d{4}-\d{4})_(.+)$/;

export function stripSeasonPrefixFromCompositionDocId(
  docId: string
): { seasonLabel: string | null; legacyId: string } {
  const match = SEASON_PREFIX_RE.exec(docId);
  if (!match || !isSeasonLabel(match[1])) {
    return { seasonLabel: null, legacyId: docId };
  }
  return { seasonLabel: match[1], legacyId: match[2] };
}

export function parseLegacyCompositionDocumentId(docId: string): {
  phase: "aller" | "retour";
  journee: number;
  championshipType: ChampionshipType;
  idEpreuve?: number;
} | null {
  const match = /^(aller|retour)_(\d+)_(masculin|feminin)(?:_(\d+))?$/.exec(
    docId.trim()
  );
  if (!match) {
    return null;
  }
  const phase = match[1] as "aller" | "retour";
  const journee = Number.parseInt(match[2], 10);
  const championshipType = match[3] as ChampionshipType;
  const idEpreuveRaw = match[4];
  if (!Number.isFinite(journee) || journee < 1) {
    return null;
  }
  if (idEpreuveRaw !== undefined) {
    const idEpreuve = Number.parseInt(idEpreuveRaw, 10);
    if (!Number.isFinite(idEpreuve)) {
      return null;
    }
    return { phase, journee, championshipType, idEpreuve };
  }
  return { phase, journee, championshipType };
}
