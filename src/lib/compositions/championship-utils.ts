import { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import { ChampionshipType } from "@/types";
import { Player } from "@/types/team-management";

export const getTeamsByType = (
  equipes: EquipeWithMatches[]
): Record<ChampionshipType, EquipeWithMatches[]> => {
  const masculin: EquipeWithMatches[] = [];
  const feminin: EquipeWithMatches[] = [];

  equipes.forEach((equipe) => {
    const isFemale = equipe.matches.some((match) => match.isFemale === true);
    if (isFemale) {
      feminin.push(equipe);
    } else {
      masculin.push(equipe);
    }
  });

  return { masculin, feminin };
};

export const getPlayersByType = (
  players: Player[],
  championshipType: ChampionshipType
): Player[] => {
  if (championshipType === "masculin") {
    return players;
  }

  return players.filter((player) => player.gender === "F");
};

