import { Player } from "@/types/team-management";

export interface JoueursFilters {
  gender: string;
  nationality: string;
  isActive: boolean;
  hasPlayedMatch: string;
  inChampionship: string;
  inChampionshipParis: string;
  hasDiscord: string;
}

export function getPlayersForTab(
  tabIndex: number,
  players: Player[],
  playersWithoutLicense: Player[],
  temporaryPlayers: Player[]
): Player[] {
  switch (tabIndex) {
    case 0:
      return players;
    case 1:
      return playersWithoutLicense;
    case 2:
      return temporaryPlayers;
    default:
      return players;
  }
}

export function applyJoueursFilters(params: {
  sourcePlayers: Player[];
  searchQuery: string;
  filters: JoueursFilters;
  hasValidDiscord: (player: Player) => boolean;
}): Player[] {
  const { sourcePlayers, searchQuery, filters, hasValidDiscord } = params;
  let filtered = sourcePlayers;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.firstName.toLowerCase().includes(query) ||
        player.license.includes(query)
    );
  }

  if (filters.gender) {
    filtered = filtered.filter((player) => player.gender === filters.gender);
  }

  if (filters.nationality) {
    filtered = filtered.filter(
      (player) => player.nationality === filters.nationality
    );
  }

  if (filters.hasPlayedMatch !== "") {
    const hasPlayed = filters.hasPlayedMatch === "true";
    filtered = filtered.filter(
      (player) => (player.hasPlayedAtLeastOneMatch || false) === hasPlayed
    );
  }

  if (filters.inChampionship !== "") {
    const inChampionship = filters.inChampionship === "true";
    filtered = filtered.filter(
      (player) =>
        (player.participation?.championnat || false) === inChampionship
    );
  }

  if (filters.inChampionshipParis !== "") {
    const inChampionshipParis = filters.inChampionshipParis === "true";
    filtered = filtered.filter(
      (player) =>
        (player.participation?.championnatParis || false) === inChampionshipParis
    );
  }

  if (filters.hasDiscord !== "") {
    const hasDiscord = filters.hasDiscord === "true";
    filtered = filtered.filter((player) => hasValidDiscord(player) === hasDiscord);
  }

  return filtered;
}
