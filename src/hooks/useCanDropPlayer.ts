import { useCallback } from "react";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import type { AssignmentValidationResult } from "@/lib/compositions/validation";
import { canAssignPlayerToTeam } from "@/lib/compositions/validation";
import { JOURNEE_CONCERNEE_PAR_REGLE } from "@/lib/compositions/validation";
import { useMaxPlayersForTeam } from "./useMaxPlayersForTeam";

interface UseCanDropPlayerOptions {
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: Record<string, string[]>;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  isParis?: boolean;
}

/**
 * Hook pour vérifier si un joueur peut être assigné à une équipe
 */
export function useCanDropPlayer(options: UseCanDropPlayerOptions) {
  const {
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    isParis = false,
  } = options;

  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  const canDropPlayer = useCallback(
    (playerId: string, teamId: string): AssignmentValidationResult => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : 4;

      return canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions,
        selectedPhase,
        selectedJournee,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });
    },
    [
      players,
      equipes,
      compositions,
      selectedPhase,
      selectedJournee,
      getMaxPlayersForTeam,
    ]
  );

  return { canDropPlayer };
}

