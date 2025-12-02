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
  // Setters pour les états (optionnels si on veut gérer les états dans le hook)
  compositions?: Record<string, string[]>;
  setCompositions?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  isResetting?: boolean;
  setIsResetting?: React.Dispatch<React.SetStateAction<boolean>>;
  isApplyingDefaults?: boolean;
  setIsApplyingDefaults?: React.Dispatch<React.SetStateAction<boolean>>;
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
    selectedJournee,
    selectedPhase,
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
    compositions: externalCompositions,
    setCompositions: externalSetCompositions,
    isResetting: externalIsResetting,
    setIsResetting: externalSetIsResetting,
    isApplyingDefaults: externalIsApplyingDefaults,
    setIsApplyingDefaults: externalSetIsApplyingDefaults,
  } = options;

  // États internes (utilisés si les setters externes ne sont pas fournis)
  const [internalCompositions, setInternalCompositions] = useState<Record<string, string[]>>({});
  const [internalSelectedJournee, setInternalSelectedJournee] = useState<number | null>(
    selectedJournee
  );
  const [internalSelectedPhase, setInternalSelectedPhase] = useState<"aller" | "retour" | null>(
    selectedPhase
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  const [internalIsResetting, setInternalIsResetting] = useState(false);
  const [internalIsApplyingDefaults, setInternalIsApplyingDefaults] = useState(false);

  // Utiliser les états externes si fournis, sinon utiliser les internes
  const compositions = externalCompositions ?? internalCompositions;
  const setCompositions = externalSetCompositions ?? setInternalCompositions;
  const isResetting = externalIsResetting ?? internalIsResetting;
  const setIsResetting = externalSetIsResetting ?? setInternalIsResetting;
  const isApplyingDefaults = externalIsApplyingDefaults ?? internalIsApplyingDefaults;
  const setIsApplyingDefaults = externalSetIsApplyingDefaults ?? setInternalIsApplyingDefaults;
  const defaultCompositions = initialDefaultCompositions;
  const defaultCompositionsLoaded = initialDefaultCompositionsLoaded;

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

    if (setIsResetting) {
      setIsResetting(true);
    }

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
      if (setCompositions) {
        setCompositions(previousState);
      }
    } finally {
      if (setIsResetting) {
        setIsResetting(false);
      }
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
    setCompositions,
    setIsResetting,
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

    if (setIsApplyingDefaults) {
      setIsApplyingDefaults(true);
    }

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

      if (setCompositions) {
        setCompositions(nextCompositions);
      }
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
      if (setCompositions) {
        setCompositions(previousState);
      }
    } finally {
      if (setIsApplyingDefaults) {
        setIsApplyingDefaults(false);
      }
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
    setCompositions,
    setIsApplyingDefaults,
  ]);

  // Fonction pour mettre à jour une composition
  const updateComposition = useCallback(
    (teamId: string, playerIds: string[]) => {
      if (setCompositions) {
        setCompositions((prev) => ({
          ...prev,
          [teamId]: playerIds,
        }));
      }
    },
    [setCompositions]
  );

  return {
    // États
    compositions,
    setCompositions,
    selectedJournee: selectedJournee ?? internalSelectedJournee,
    setSelectedJournee: setInternalSelectedJournee,
    selectedPhase: selectedPhase ?? internalSelectedPhase,
    setSelectedPhase: setInternalSelectedPhase,
    tabValue,
    setTabValue,
    defaultCompositions,
    setDefaultCompositions: () => {
      // Les defaultCompositions sont gérés par le composant parent
      // Le hook ne modifie pas directement cet état
    },
    defaultCompositionsLoaded,
    setDefaultCompositionsLoaded: () => {
      // Les defaultCompositionsLoaded sont gérés par le composant parent
      // Le hook ne modifie pas directement cet état
    },
    isResetting,
    isApplyingDefaults,
    // Fonctions
    resetCompositions,
    applyDefaults,
    updateComposition,
  };
}

