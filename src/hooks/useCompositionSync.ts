import { useState, useEffect } from "react";
import { useCompositionRealtime } from "./useCompositionRealtime";
import type { EquipeWithMatches } from "./useEquipesWithMatches";

interface UseCompositionSyncOptions {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  championshipType: "masculin" | "feminin";
  defaultCompositions: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  };
  defaultCompositionsLoaded: boolean;
  availabilities: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  };
  availabilitiesLoaded: boolean;
  equipes: EquipeWithMatches[];
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
}

export function useCompositionSync({
  selectedJournee,
  selectedPhase,
  championshipType,
  defaultCompositions,
  defaultCompositionsLoaded,
  availabilities,
  availabilitiesLoaded,
  equipes,
  getMaxPlayersForTeam,
}: UseCompositionSyncOptions) {
  const [compositions, setCompositions] = useState<Record<string, string[]>>(
    {}
  );

  // Écouter les compositions en temps réel
  const { composition: realtimeComposition, error: compositionError } =
    useCompositionRealtime(selectedJournee, selectedPhase, championshipType);

  // Mettre à jour les compositions en fonction de la composition en temps réel ou des defaults
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setCompositions({});
      return;
    }

    // Si une composition existe en temps réel, l'utiliser
    if (realtimeComposition) {
      setCompositions(realtimeComposition.teams);
      return;
    }

    // Sinon, utiliser les defaults si disponibles
    if (!defaultCompositionsLoaded || !availabilitiesLoaded) {
      setCompositions({});
      return;
    }

    const defaultsForType = defaultCompositions[championshipType] || {};
    const availabilityMap =
      (championshipType === "masculin"
        ? availabilities.masculin
        : availabilities.feminin) || {};

    const initialTeams = Object.fromEntries(
      Object.entries(defaultsForType).map(([teamId, playerIds]) => {
        const equipe = equipes.find((e) => e.team.id === teamId);
        const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : 4;
        const availablePlayerIds = playerIds
          .filter((id) => availabilityMap[id]?.available === true)
          .slice(0, maxPlayers);
        return [teamId, availablePlayerIds];
      })
    );

    setCompositions(initialTeams);
  }, [
    selectedJournee,
    selectedPhase,
    realtimeComposition,
    championshipType,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilities,
    availabilitiesLoaded,
    equipes,
    getMaxPlayersForTeam,
  ]);

  // Gérer les erreurs de chargement
  useEffect(() => {
    if (compositionError) {
      console.error(
        "Erreur lors de l'écoute des compositions:",
        compositionError
      );
    }
  }, [compositionError]);

  return {
    compositions,
    setCompositions,
  };
}

