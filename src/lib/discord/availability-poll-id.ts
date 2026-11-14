import { ChampionshipType } from "@/types/championship";
import { isSeasonLabel } from "@/lib/championship/calendar-season-label";

export type ParsedAvailabilityPollId = {
  seasonLabel: string | null;
  phase: "aller" | "retour";
  journee: number;
  championshipType: ChampionshipType;
  idEpreuve?: number;
};

export function buildAvailabilityPollId(params: {
  seasonLabel?: string | null;
  phase: "aller" | "retour";
  journee: number;
  championshipType: ChampionshipType;
  idEpreuve?: number;
}): string {
  const base =
    params.idEpreuve !== undefined
      ? `${params.phase}_${params.journee}_${params.championshipType}_${params.idEpreuve}`
      : `${params.phase}_${params.journee}_${params.championshipType}`;
  const season = params.seasonLabel?.trim();
  if (season && isSeasonLabel(season)) {
    return `${season}_${base}`;
  }
  return base;
}

export function parseAvailabilityPollId(
  pollId: string
): ParsedAvailabilityPollId | null {
  const parts = pollId.split("_");
  if (parts.length < 3) {
    return null;
  }

  let offset = 0;
  let seasonLabel: string | null = null;
  if (isSeasonLabel(parts[0])) {
    seasonLabel = parts[0];
    offset = 1;
  }

  if (parts.length < offset + 3) {
    return null;
  }

  const phase = parts[offset];
  if (phase !== "aller" && phase !== "retour") {
    return null;
  }

  const journee = Number.parseInt(parts[offset + 1], 10);
  if (!Number.isFinite(journee) || journee < 1) {
    return null;
  }

  const championshipType = parts[offset + 2];
  if (championshipType !== "masculin" && championshipType !== "feminin") {
    return null;
  }

  const idRaw = parts[offset + 3];
  const idEpreuve =
    idRaw !== undefined && idRaw !== ""
      ? Number.parseInt(idRaw, 10)
      : undefined;
  if (idRaw !== undefined && (idEpreuve === undefined || Number.isNaN(idEpreuve))) {
    return null;
  }

  return {
    seasonLabel,
    phase,
    journee,
    championshipType,
    ...(idEpreuve !== undefined ? { idEpreuve } : {}),
  };
}
