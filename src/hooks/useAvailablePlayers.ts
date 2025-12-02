import { useMemo } from "react";
import type { Player } from "@/types/team-management";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface UseAvailablePlayersOptions {
  players: Player[];
  playerPool?: Player[];
  includeAllPlayers?: boolean;
  selectedEpreuve: EpreuveType | null;
  tabValue?: number; // 0 = masculin, 1 = féminin
  defaultCompositionTab?: "masculin" | "feminin";
  availabilities?: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  };
  selectedJournee?: number | null;
  selectedPhase?: "aller" | "retour" | null;
  isParis?: boolean;
}

interface UseAvailablePlayersResult {
  availablePlayers: Player[];
  championshipPlayers: Player[];
  playerPool: Player[];
}

/**
 * Hook pour calculer les joueurs disponibles selon le contexte (compositions ou defaults)
 */
export function useAvailablePlayers(
  options: UseAvailablePlayersOptions
): UseAvailablePlayersResult {
  const {
    players,
    playerPool: providedPlayerPool,
    includeAllPlayers = false,
    selectedEpreuve,
    tabValue,
    defaultCompositionTab,
    availabilities,
    selectedJournee,
    selectedPhase,
    isParis = false,
  } = options;

  // Calculer les joueurs du championnat (sans filtrage par disponibilité)
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

  // Calculer le pool de joueurs (tous ou seulement ceux du championnat)
  const playerPool = useMemo(
    () => (includeAllPlayers ? players : providedPlayerPool ?? championshipPlayers),
    [players, providedPlayerPool, championshipPlayers, includeAllPlayers]
  );

  // Calculer les joueurs disponibles selon le contexte
  const availablePlayers = useMemo(() => {
    // Pour les compositions par défaut (defaults), filtrer par type de championnat
    if (defaultCompositionTab !== undefined) {
      if (defaultCompositionTab === "masculin") {
        // Championnat masculin : afficher tous les joueurs (hommes et femmes)
        return playerPool;
      } else {
        // Championnat féminin : afficher uniquement les femmes
        return playerPool.filter((player) => player.gender === "F");
      }
    }

    // Pour les compositions de journée, filtrer par disponibilité
    if (availabilities && selectedJournee !== null && selectedPhase !== null) {
      const championshipType = isParis
        ? "masculin"
        : tabValue === 0
        ? "masculin"
        : "feminin";
      const availabilityMap = availabilities[championshipType] || {};

      return playerPool.filter((player) => {
        // Vérifier la disponibilité selon le type de championnat
        const playerAvailability = availabilityMap[player.id];

        // Si pas de réponse, ne pas afficher (seulement les joueurs qui ont répondu)
        if (!playerAvailability) {
          return false;
        }

        // Afficher seulement les joueurs disponibles (available === true)
        return playerAvailability.available === true;
      });
    }

    // Par défaut, retourner le pool complet
    return playerPool;
  }, [
    playerPool,
    defaultCompositionTab,
    availabilities,
    selectedJournee,
    selectedPhase,
    tabValue,
    isParis,
  ]);

  return {
    availablePlayers,
    championshipPlayers,
    playerPool,
  };
}

