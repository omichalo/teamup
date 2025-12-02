import { useState, useCallback } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { CompositionService } from "@/lib/services/composition-service";
import { extractTeamNumber } from "@/lib/compositions/validation";
import type { Player } from "@/types/team-management";
import type { ChampionshipType } from "./useChampionshipTypes";

interface UseCompositionStateOptions {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  equipesByType: {
    masculin: EquipeWithMatches[];
    feminin: EquipeWithMatches[];
  };
  filteredEquipes: EquipeWithMatches[];
  players: Player[];
  availabilities: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  };
  defaultCompositions: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  };
  defaultCompositionsLoaded: boolean;
  availabilitiesLoaded: boolean;
  compositionService: CompositionService;
  hasAssignedPlayers: boolean;
  hasDefaultCompositions: boolean;
}

interface UseCompositionStateResult {
  // États
  compositions: Record<string, string[]>;
  setCompositions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  selectedJournee: number | null;
  setSelectedJournee: React.Dispatch<React.SetStateAction<number | null>>;
  selectedPhase: "aller" | "retour" | null;
  setSelectedPhase: React.Dispatch<React.SetStateAction<"aller" | "retour" | null>>;
  tabValue: number;
  setTabValue: React.Dispatch<React.SetStateAction<number>>;
  defaultCompositions: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  };
  setDefaultCompositions: React.Dispatch<
    React.SetStateAction<{
      masculin: Record<string, string[]>;
      feminin: Record<string, string[]>;
    }>
  >;
  defaultCompositionsLoaded: boolean;
  setDefaultCompositionsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  isResetting: boolean;
  isApplyingDefaults: boolean;
  // Fonctions
  resetCompositions: () => Promise<void>;
  applyDefaults: () => Promise<void>;
  updateComposition: (teamId: string, playerIds: string[]) => void;
}

/**
 * Hook pour gérer l'état des compositions d'équipes
 */
export function useCompositionState(
  options: UseCompositionStateOptions
): UseCompositionStateResult {
  const {
    selectedJournee: initialSelectedJournee,
    selectedPhase: initialSelectedPhase,
    equipesByType,
    filteredEquipes,
    players,
    availabilities,
    defaultCompositions: initialDefaultCompositions,
    defaultCompositionsLoaded: initialDefaultCompositionsLoaded,
    availabilitiesLoaded,
    compositionService,
    hasAssignedPlayers,
    hasDefaultCompositions,
  } = options;

  // États
  const [compositions, setCompositions] = useState<Record<string, string[]>>({});
  const [selectedJournee, setSelectedJournee] = useState<number | null>(
    initialSelectedJournee
  );
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    initialSelectedPhase
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  const [defaultCompositions, setDefaultCompositions] = useState<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>(initialDefaultCompositions);
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] = useState(
    initialDefaultCompositionsLoaded
  );
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

  // Fonction pour réinitialiser les compositions
  const resetCompositions = useCallback(async () => {
    if (
      selectedJournee === null ||
      selectedPhase === null ||
      !hasAssignedPlayers ||
      isResetting
    ) {
      console.log("[Compositions] Reset cancelled", {
        selectedJournee,
        selectedPhase,
        hasAssignedPlayers,
        isResetting,
      });
      return;
    }

    console.log("[Compositions] Reset compositions started", {
      journee: selectedJournee,
      phase: selectedPhase,
    });

    setIsResetting(true);

    const previousState: Record<string, string[]> = Object.fromEntries(
      Object.entries(compositions).map(([teamId, playerIds]) => [
        teamId,
        [...playerIds],
      ])
    );

    const masculineTeamIds = equipesByType.masculin.map(
      (equipe) => equipe.team.id
    );
    const feminineTeamIds = equipesByType.feminin.map(
      (equipe) => equipe.team.id
    );

    const emptyTeamsEntries = [
      ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
      ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
    ];
    const emptyTeams = Object.fromEntries(emptyTeamsEntries);

    setCompositions(emptyTeams);

    try {
      await Promise.all([
        masculineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "masculin",
              teams: Object.fromEntries(
                masculineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  [],
                ])
              ),
            })
          : Promise.resolve(),
        feminineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "feminin",
              teams: Object.fromEntries(
                feminineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  [],
                ])
              ),
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation des compositions:",
        error
      );
      console.log("[Compositions] Reset compositions failed", {
        journee: selectedJournee,
        phase: selectedPhase,
        error,
      });
      setCompositions(previousState);
    } finally {
      setIsResetting(false);
      console.log("[Compositions] Reset compositions finished", {
        journee: selectedJournee,
        phase: selectedPhase,
      });
    }
  }, [
    compositions,
    compositionService,
    equipesByType,
    hasAssignedPlayers,
    isResetting,
    selectedJournee,
    selectedPhase,
  ]);

  // Fonction pour appliquer les compositions par défaut
  const applyDefaults = useCallback(async () => {
    if (
      selectedJournee === null ||
      selectedPhase === null ||
      !defaultCompositionsLoaded ||
      !availabilitiesLoaded ||
      !hasDefaultCompositions ||
      isApplyingDefaults
    ) {
      console.log("[Compositions] Apply defaults cancelled", {
        selectedJournee,
        selectedPhase,
        defaultCompositionsLoaded,
        availabilitiesLoaded,
        hasDefaultCompositions,
        isApplyingDefaults,
      });
      return;
    }

    setIsApplyingDefaults(true);

    const previousState: Record<string, string[]> = Object.fromEntries(
      Object.entries(compositions).map(([teamId, playerIds]) => [
        teamId,
        [...playerIds],
      ])
    );

    try {
      const masculineTeamIds = equipesByType.masculin.map(
        (equipe) => equipe.team.id
      );
      const feminineTeamIds = equipesByType.feminin.map(
        (equipe) => equipe.team.id
      );

      console.log("[Compositions] Apply defaults started", {
        journee: selectedJournee,
        phase: selectedPhase,
        masculineTeamIds,
        feminineTeamIds,
      });

      const nextCompositions: Record<string, string[]> = Object.fromEntries([
        ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
        ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
      ]);

      const processType = (
        championshipType: ChampionshipType,
        teamIds: string[]
      ) => {
        const defaultsForType = defaultCompositions[championshipType] || {};
        const availabilityMap =
          (championshipType === "masculin"
            ? availabilities.masculin
            : availabilities.feminin) || {};

        teamIds.forEach((teamId) => {
          const defaultPlayers = defaultsForType[teamId] || [];
          const nextTeamPlayers: string[] = [];

          defaultPlayers.forEach((playerId) => {
            const availability = availabilityMap[playerId];
            if (!availability || availability.available !== true) {
              console.log("[Compositions] Player skipped (not available)", {
                playerId,
                teamId,
                championshipType,
                availability,
              });
              return;
            }

            const player = players.find((p) => p.id === playerId);
            if (!player) {
              console.log("[Compositions] Player skipped (not found)", {
                playerId,
                teamId,
                championshipType,
              });
              return;
            }

            if (nextTeamPlayers.length >= 5) {
              console.log("[Compositions] Player skipped (team full)", {
                playerId,
                teamId,
                championshipType,
              });
              return;
            }

            const maxMasculine =
              player.highestMasculineTeamNumberByPhase?.[
                selectedPhase || "aller"
              ];
            const maxFeminine =
              player.highestFeminineTeamNumberByPhase?.[
                selectedPhase || "aller"
              ];
            const teamNumber = extractTeamNumber(
              filteredEquipes.find((eq) => eq.team.id === teamId)?.team.name ||
                ""
            );

            if (
              teamNumber > 0 &&
              ((championshipType === "masculin" &&
                maxMasculine !== undefined &&
                maxMasculine !== null &&
                teamNumber > maxMasculine) ||
                (championshipType === "feminin" &&
                  maxFeminine !== undefined &&
                  maxFeminine !== null &&
                  teamNumber > maxFeminine))
            ) {
              console.log("[Compositions] Player skipped (burning rule)", {
                playerId,
                teamId,
                championshipType,
                teamNumber,
                maxMasculine,
                maxFeminine,
              });
              return;
            }

            nextTeamPlayers.push(playerId);
            console.log("[Compositions] Player added from defaults", {
              playerId,
              teamId,
              championshipType,
              nextTeamPlayers,
            });
          });

          nextCompositions[teamId] = nextTeamPlayers;
        });
      };

      processType("masculin", masculineTeamIds);
      processType("feminin", feminineTeamIds);

      setCompositions(nextCompositions);
      console.log("[Compositions] Apply defaults next state", nextCompositions);

      await Promise.all([
        masculineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "masculin",
              teams: Object.fromEntries(
                masculineTeamIds.map((teamId) => [
                  teamId,
                  nextCompositions[teamId] || [],
                ])
              ),
            })
          : Promise.resolve(),
        feminineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "feminin",
              teams: Object.fromEntries(
                feminineTeamIds.map((teamId) => [
                  teamId,
                  nextCompositions[teamId] || [],
                ])
              ),
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error(
        "Erreur lors de la copie des compositions par défaut:",
        error
      );
      console.log("[Compositions] Apply defaults failed", {
        journee: selectedJournee,
        phase: selectedPhase,
        error,
      });
      setCompositions(previousState);
    } finally {
      setIsApplyingDefaults(false);
      console.log("[Compositions] Apply defaults finished", {
        journee: selectedJournee,
        phase: selectedPhase,
      });
    }
  }, [
    selectedJournee,
    selectedPhase,
    defaultCompositionsLoaded,
    availabilitiesLoaded,
    hasDefaultCompositions,
    isApplyingDefaults,
    compositions,
    equipesByType,
    defaultCompositions,
    availabilities,
    players,
    filteredEquipes,
    compositionService,
  ]);

  // Fonction pour mettre à jour une composition
  const updateComposition = useCallback(
    (teamId: string, playerIds: string[]) => {
      setCompositions((prev) => ({
        ...prev,
        [teamId]: playerIds,
      }));
    },
    []
  );

  return {
    // États
    compositions,
    setCompositions,
    selectedJournee,
    setSelectedJournee,
    selectedPhase,
    setSelectedPhase,
    tabValue,
    setTabValue,
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
    setDefaultCompositionsLoaded,
    isResetting,
    isApplyingDefaults,
    // Fonctions
    resetCompositions,
    applyDefaults,
    updateComposition,
  };
}

