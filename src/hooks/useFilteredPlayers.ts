import { useMemo } from "react";
import type { Player } from "@/types/team-management";

/**
 * Hook pour filtrer les joueurs par recherche (nom, prénom, licence)
 */
export function useFilteredPlayers(
  players: Player[],
  searchQuery: string
): Player[] {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return players;
    }

    const normalized = searchQuery.trim().toLowerCase();
    return players.filter((player) => {
      const fullName = `${player.firstName} ${player.name}`.toLowerCase();
      const license = player.license?.toLowerCase() ?? "";
      const licenseId = player.id.toLowerCase();
      return (
        fullName.includes(normalized) ||
        license.includes(normalized) ||
        licenseId.includes(normalized)
      );
    });
  }, [players, searchQuery]);
}

