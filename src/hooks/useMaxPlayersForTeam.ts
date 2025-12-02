import { useCallback } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { getParisTeamStructure, isParisChampionship } from "@/lib/compositions/validation";

interface UseMaxPlayersForTeamOptions {
  isParis?: boolean;
}

/**
 * Hook pour calculer le nombre maximum de joueurs par équipe selon l'épreuve et la division
 */
export function useMaxPlayersForTeam(options: UseMaxPlayersForTeamOptions = {}) {
  const { isParis = false } = options;

  const getMaxPlayersForTeam = useCallback(
    (equipe: EquipeWithMatches): number => {
      // Vérifier directement si l'équipe fait partie du championnat de Paris
      if (isParis || isParisChampionship(equipe)) {
        const structure = getParisTeamStructure(equipe.team.division || "");
        return structure?.totalPlayers || 4; // Fallback à 4 si structure non reconnue
      }
      return 4; // Championnat par équipes : 4 joueurs
    },
    [isParis]
  );

  return { getMaxPlayersForTeam };
}

