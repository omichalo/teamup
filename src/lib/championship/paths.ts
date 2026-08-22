import { sanitizeSeasonLabel } from "./person-key";

export const SEASONS_COLLECTION = "seasons";
export const CHAMPIONSHIP_PLAYERS_COLLECTION = "championshipPlayers";
export const PLAYER_CLUB_PROFILES_COLLECTION = "playerClubProfiles";

export function championshipPlayersCollectionPath(seasonLabel: string): string {
  return `${SEASONS_COLLECTION}/${sanitizeSeasonLabel(seasonLabel)}/${CHAMPIONSHIP_PLAYERS_COLLECTION}`;
}

export function championshipPlayerDocPath(
  seasonLabel: string,
  personKey: string
): string {
  return `${championshipPlayersCollectionPath(seasonLabel)}/${personKey}`;
}
