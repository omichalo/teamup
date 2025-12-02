import { useMemo, useCallback } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import type { Player } from "@/types/team-management";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { getMatchForTeamAndJournee, getPlayersFromMatch, isMatchPlayed } from "@/lib/compositions/validation";
import { useCanDropPlayer } from "./useCanDropPlayer";
import { useMaxPlayersForTeam } from "./useMaxPlayersForTeam";

interface TeamCompositionData {
  equipe: EquipeWithMatches;
  teamPlayers: Player[];
  isDragOver: boolean;
  canDrop: boolean;
  dropReason: string | undefined;
  validationError: string | undefined;
  offendingPlayerIds: string[];
  matchPlayed: boolean;
  maxPlayers: number;
  championshipType: "masculin" | "feminin";
  isParis: boolean;
  teamAvailabilityMap: Record<string, { available?: boolean; comment?: string }> | undefined;
}

interface UseCompositionTeamListOptions {
  equipes: EquipeWithMatches[];
  players: Player[];
  compositions: Record<string, string[]> | undefined;
  defaultCompositions: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  } | undefined;
  selectedEpreuve: EpreuveType | null;
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  tabValue?: number; // 0 = masculin, 1 = féminin
  defaultCompositionTab: "masculin" | "feminin" | undefined;
  isParis: boolean;
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  teamValidationErrors: Record<string, { reason?: string; offendingPlayerIds?: string[] }> | undefined;
  defaultCompositionErrors: Record<string, string | undefined> | undefined;
  availabilities: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  } | undefined;
  mode: "daily" | "defaults";
}

interface UseCompositionTeamListResult {
  teamsData: TeamCompositionData[];
  getTeamData: (equipe: EquipeWithMatches) => TeamCompositionData | null;
}

/**
 * Hook pour calculer les données nécessaires au rendu de chaque équipe dans une liste de compositions
 */
export function useCompositionTeamList(
  options: UseCompositionTeamListOptions
): UseCompositionTeamListResult {
  const {
    equipes,
    players,
    compositions,
    defaultCompositions,
    selectedEpreuve,
    selectedJournee,
    selectedPhase,
    tabValue = 0,
    defaultCompositionTab,
    isParis,
    draggedPlayerId,
    dragOverTeamId,
    teamValidationErrors,
    defaultCompositionErrors,
    availabilities,
    mode,
  } = options;

  const { canDropPlayer } = useCanDropPlayer({
    players,
    equipes,
    compositions: compositions || {},
    selectedPhase,
    selectedJournee,
    isParis,
  });

  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  // Déterminer le type de championnat
  const championshipType = useMemo(() => {
    if (mode === "defaults") {
      return defaultCompositionTab || "masculin";
    }
    return isParis ? "masculin" : tabValue === 0 ? "masculin" : "feminin";
  }, [mode, defaultCompositionTab, isParis, tabValue]);

  // Fonction pour obtenir les joueurs d'une équipe
  const getTeamPlayers = useCallback(
    (equipe: EquipeWithMatches): Player[] => {
      if (mode === "daily" && selectedJournee && selectedPhase) {
        const match = getMatchForTeamAndJournee(equipe, selectedJournee, selectedPhase) ?? null;
        const matchPlayed = isMatchPlayed(match);
        
        if (matchPlayed) {
          return getPlayersFromMatch(match, players);
        }
        
        const playerIds = compositions?.[equipe.team.id] || [];
        return playerIds
          .map((playerId) => players.find((p) => p.id === playerId))
          .filter((p): p is Player => p !== undefined);
      } else if (mode === "defaults" && defaultCompositions) {
        const championshipTypeForTeam =
          selectedEpreuve === "championnat_paris"
            ? "masculin"
            : equipe.matches.some((match) => match.isFemale === true)
            ? "feminin"
            : "masculin";
        const assignments = defaultCompositions[championshipTypeForTeam][equipe.team.id] || [];
        return assignments
          .map((playerId) => players.find((p) => p.id === playerId))
          .filter((p): p is Player => p !== undefined);
      }
      return [];
    },
    [
      mode,
      selectedJournee,
      selectedPhase,
      compositions,
      defaultCompositions,
      players,
      selectedEpreuve,
    ]
  );

  // Fonction pour obtenir les données d'une équipe
  const getTeamData = useCallback(
    (equipe: EquipeWithMatches): TeamCompositionData | null => {
      const teamPlayers = getTeamPlayers(equipe);
      
      let matchPlayed = false;
      if (mode === "daily" && selectedJournee && selectedPhase) {
        const match = getMatchForTeamAndJournee(equipe, selectedJournee, selectedPhase) ?? null;
        matchPlayed = isMatchPlayed(match);
      }

      const isDragOver = !matchPlayed && draggedPlayerId && dragOverTeamId === equipe.team.id;
      
      const dropCheck =
        !matchPlayed && draggedPlayerId && dragOverTeamId === equipe.team.id
          ? canDropPlayer(draggedPlayerId, equipe.team.id)
          : {
              canAssign: true,
              reason: undefined,
              simulatedPlayers: teamPlayers,
              willBeBurned: false,
            };
      
      const canDrop = matchPlayed ? false : dropCheck.canAssign;
      
      let validationError: string | undefined;
      let offendingPlayerIds: string[] = [];
      
      if (mode === "daily" && teamValidationErrors) {
        const validationInfo = teamValidationErrors[equipe.team.id];
        validationError = validationInfo?.reason;
        offendingPlayerIds = validationInfo?.offendingPlayerIds ?? [];
      } else if (mode === "defaults" && defaultCompositionErrors) {
        validationError = defaultCompositionErrors[equipe.team.id];
      }

      const championshipTypeForTeam =
        mode === "defaults" && selectedEpreuve === "championnat_paris"
          ? "masculin"
          : mode === "defaults"
          ? equipe.matches.some((match) => match.isFemale === true)
            ? "feminin"
            : "masculin"
          : championshipType;

      const teamAvailabilityMap =
        mode === "daily" && availabilities
          ? isParis
            ? availabilities.masculin || {}
            : availabilities[championshipType] || {}
          : undefined;

      return {
        equipe,
        teamPlayers,
        isDragOver: Boolean(isDragOver),
        canDrop,
        dropReason: dropCheck.reason,
        validationError,
        offendingPlayerIds,
        matchPlayed,
        maxPlayers: getMaxPlayersForTeam(equipe),
        championshipType: championshipTypeForTeam,
        isParis: isParis || (mode === "defaults" && selectedEpreuve === "championnat_paris"),
        teamAvailabilityMap,
      };
    },
    [
      getTeamPlayers,
      mode,
      selectedJournee,
      selectedPhase,
      draggedPlayerId,
      dragOverTeamId,
      canDropPlayer,
      teamValidationErrors,
      defaultCompositionErrors,
      championshipType,
      availabilities,
      isParis,
      selectedEpreuve,
      getMaxPlayersForTeam,
    ]
  );

  // Calculer les données pour toutes les équipes
  const teamsData = useMemo(
    () => equipes.map((equipe) => getTeamData(equipe)).filter((data): data is TeamCompositionData => data !== null),
    [equipes, getTeamData]
  );

  return {
    teamsData,
    getTeamData,
  };
}

