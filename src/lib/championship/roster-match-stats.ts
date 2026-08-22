import type { ChampionshipPlayerRecord } from "./schema";

const SEASONAL_MATCH_STAT_KEYS = [
  "hasPlayedAtLeastOneMatch",
  "hasPlayedAtLeastOneMatchParis",
  "highestMasculineTeamNumberByPhase",
  "highestFeminineTeamNumberByPhase",
  "highestTeamNumberByPhaseParis",
  "masculineMatchesByTeamByPhase",
  "feminineMatchesByTeamByPhase",
  "matchesByTeamByPhaseParis",
] as const;

export type RosterMatchStatsSource = {
  id: string;
  ffttLicense?: string | null | undefined;
} & Partial<
  Pick<ChampionshipPlayerRecord, (typeof SEASONAL_MATCH_STAT_KEYS)[number]>
>;

export function rosterDocHasSeasonalMatchStats(
  record: RosterMatchStatsSource
): boolean {
  return SEASONAL_MATCH_STAT_KEYS.some((key) => record[key] != null);
}

export function rosterDocIdsWithSeasonalMatchStats(
  records: ReadonlyArray<RosterMatchStatsSource>
): string[] {
  const ids = new Set<string>();
  for (const record of records) {
    if (!rosterDocHasSeasonalMatchStats(record)) {
      continue;
    }
    if (record.id) {
      ids.add(record.id);
    }
    const license = record.ffttLicense;
    if (typeof license === "string" && license.trim()) {
      ids.add(license.trim());
    }
  }
  return [...ids];
}
