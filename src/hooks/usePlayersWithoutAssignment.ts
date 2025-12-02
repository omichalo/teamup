import { useMemo } from "react";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "./useEquipesWithMatches";

interface UsePlayersWithoutAssignmentOptions {
  availablePlayers: Player[];
  filteredAvailablePlayers: Player[];
  currentTeams: EquipeWithMatches[];
  assignments: Record<string, string[]>;
}

/**
 * Hook pour calculer les joueurs disponibles sans assignation
 */
export function usePlayersWithoutAssignment(
  options: UsePlayersWithoutAssignmentOptions
): {
  availablePlayersWithoutAssignment: Player[];
  filteredAvailablePlayersWithoutAssignment: Player[];
} {
  const { availablePlayers, filteredAvailablePlayers, currentTeams, assignments } =
    options;

  return useMemo(() => {
    const assignedIds = new Set<string>();
    currentTeams.forEach((equipe) => {
      (assignments[equipe.team.id] || []).forEach((id) =>
        assignedIds.add(id)
      );
    });

    const base = availablePlayers.filter(
      (player) => !assignedIds.has(player.id)
    );
    const filtered = filteredAvailablePlayers.filter(
      (player) => !assignedIds.has(player.id)
    );

    return {
      availablePlayersWithoutAssignment: base,
      filteredAvailablePlayersWithoutAssignment: filtered,
    };
  }, [availablePlayers, filteredAvailablePlayers, currentTeams, assignments]);
}

