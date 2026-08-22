export const CHAMPIONNAT_EQUIPE_COMPETITION_ID = "championnat_equipe";
export const CHAMPIONNAT_PARIS_COMPETITION_ID = "championnat_paris";

export type ChampionshipCompetitionFlags = {
  championnat: boolean;
  championnatParis: boolean;
};

export function flagsFromCompetitionIds(
  competitionIds: readonly string[] | null | undefined
): ChampionshipCompetitionFlags {
  const ids = new Set(competitionIds ?? []);
  return {
    championnat: ids.has(CHAMPIONNAT_EQUIPE_COMPETITION_ID),
    championnatParis: ids.has(CHAMPIONNAT_PARIS_COMPETITION_ID),
  };
}

export function hasChampionshipCompetitionIntent(
  competitionIds: readonly string[] | null | undefined
): boolean {
  const flags = flagsFromCompetitionIds(competitionIds);
  return flags.championnat || flags.championnatParis;
}
