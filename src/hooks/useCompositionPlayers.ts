import { useState, useCallback, useMemo } from "react";
import type { Player } from "@/types/team-management";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface UseCompositionPlayersOptions {
  includeAllPlayers?: boolean;
  selectedEpreuve: EpreuveType | null;
}

interface UseCompositionPlayersResult {
  players: Player[];
  loadingPlayers: boolean;
  loadPlayers: () => Promise<void>;
  championshipPlayers: Player[];
  playerPool: Player[];
}

/**
 * Hook pour charger et filtrer les joueurs selon le championnat
 */
export function useCompositionPlayers(
  options: UseCompositionPlayersOptions
): UseCompositionPlayersResult {
  const { includeAllPlayers = false, selectedEpreuve } = options;

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const playerService = useMemo(() => new FirestorePlayerService(), []);

  const loadPlayers = useCallback(async () => {
    try {
      setLoadingPlayers(true);
      const fetchedPlayers = await playerService.getAllPlayers();
      setPlayers(
        fetchedPlayers.sort((a, b) => {
          const pointsDiff = (b.points || 0) - (a.points || 0);
          if (pointsDiff !== 0) {
            return pointsDiff;
          }
          return `${a.firstName} ${a.name}`.localeCompare(
            `${b.firstName} ${b.name}`
          );
        })
      );
    } catch (error) {
      console.error("Erreur lors du chargement des joueurs:", error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [playerService]);

  const championshipPlayers = useMemo(() => {
    // Pour le championnat de Paris, filtrer par participation au championnat de Paris
    if (selectedEpreuve === "championnat_paris") {
      return players.filter(
        (player) =>
          player.participation?.championnatParis === true &&
          (player.isActive || player.isTemporary)
      );
    }
    // Pour le championnat par équipes, filtrer par participation au championnat
    return players.filter(
      (player) =>
        player.participation?.championnat === true &&
        (player.isActive || player.isTemporary)
    );
  }, [players, selectedEpreuve]);

  const playerPool = useMemo(
    () => (includeAllPlayers ? players : championshipPlayers),
    [players, championshipPlayers, includeAllPlayers]
  );

  return {
    players,
    loadingPlayers,
    loadPlayers,
    championshipPlayers,
    playerPool,
  };
}

