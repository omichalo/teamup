import { useEffect, useMemo, useState } from "react";
import { useAvailabilities } from "@/hooks/useAvailabilities";
import { useCompositions } from "@/hooks/useCompositions";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { getPlayersByType } from "@/lib/compositions/championship-utils";
import { getIdEpreuve, isParisEpreuve, EpreuveType } from "@/lib/shared/epreuve-utils";
import { Player } from "@/types/team-management";
import { ChampionshipType } from "@/types";

interface AvailabilitiesState {
  masculin?: Record<string, { available?: boolean; comment?: string }>;
  feminin?: Record<string, { available?: boolean; comment?: string }>;
}

interface UseCompositionsRealtimeSyncParams {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  selectedEpreuve: EpreuveType | null;
  tabValue: number;
  players: Player[];
  equipes: EquipeWithMatches[];
  defaultCompositions: { masculin: Record<string, string[]>; feminin: Record<string, string[]> };
  defaultCompositionsLoaded: boolean;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  setCompositions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export function useCompositionsRealtimeSync({
  selectedJournee,
  selectedPhase,
  selectedEpreuve,
  tabValue,
  players,
  equipes,
  defaultCompositions,
  defaultCompositionsLoaded,
  getMaxPlayersForTeam,
  setCompositions,
}: UseCompositionsRealtimeSyncParams) {
  const [availabilities, setAvailabilities] = useState<AvailabilitiesState>({});
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);

  const idEpreuve = useMemo(() => getIdEpreuve(selectedEpreuve), [selectedEpreuve]);

  const { availability: masculineAvailability, error: errorMasculineAvailability } =
    useAvailabilities({
      journee: selectedJournee,
      phase: selectedPhase,
      championshipType: "masculin",
      ...(idEpreuve !== undefined ? { idEpreuve } : {}),
    });

  const { availability: feminineAvailability, error: errorFeminineAvailability } =
    useAvailabilities({
      journee: selectedJournee,
      phase: selectedPhase,
      championshipType: "feminin",
      ...(idEpreuve !== undefined ? { idEpreuve } : {}),
    });

  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setAvailabilities({});
      setAvailabilitiesLoaded(false);
      return;
    }

    setAvailabilities({
      masculin: masculineAvailability?.players || {},
      feminin: feminineAvailability?.players || {},
    });
    setAvailabilitiesLoaded(true);
  }, [masculineAvailability, feminineAvailability, selectedJournee, selectedPhase]);

  useEffect(() => {
    if (errorMasculineAvailability || errorFeminineAvailability) {
      console.error(
        "Erreur lors de l'écoute des disponibilités:",
        errorMasculineAvailability || errorFeminineAvailability
      );
    }
  }, [errorMasculineAvailability, errorFeminineAvailability]);

  const championshipType: ChampionshipType = isParisEpreuve(selectedEpreuve)
    ? "masculin"
    : tabValue === 0
    ? "masculin"
    : "feminin";

  const { composition: realtimeComposition, error: compositionError } = useCompositions({
    journee: selectedJournee,
    phase: selectedPhase,
    championshipType,
  });

  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setCompositions({});
      return;
    }

    if (realtimeComposition) {
      setCompositions(realtimeComposition.teams);
      return;
    }

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
    setCompositions,
  ]);

  useEffect(() => {
    if (compositionError) {
      console.error("Erreur lors de l'écoute des compositions:", compositionError);
    }
  }, [compositionError]);

  const availablePlayers = useMemo(() => {
    if (selectedJournee === null || selectedPhase === null) {
      return [];
    }

    const availabilityMap = availabilities[championshipType] || {};
    return getPlayersByType(players, championshipType).filter((player) => {
      const playerAvailability = availabilityMap[player.id];
      if (!playerAvailability) return false;
      return playerAvailability.available === true;
    });
  }, [
    players,
    availabilities,
    championshipType,
    selectedJournee,
    selectedPhase,
  ]);

  return {
    availabilities,
    availabilitiesLoaded,
    championshipType,
    availablePlayers,
  };
}
