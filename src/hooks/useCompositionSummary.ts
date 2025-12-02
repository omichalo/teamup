import { useMemo, useCallback } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import type { Player } from "@/types/team-management";
import {
  getMatchForTeamAndJournee,
  isMatchPlayed,
} from "@/lib/compositions/validation";

interface UseCompositionSummaryOptions {
  tabValue: number;
  equipesByType: {
    masculin: EquipeWithMatches[];
    feminin: EquipeWithMatches[];
  };
  compositions: Record<string, string[]>;
  players: Player[];
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  isParis: boolean;
  teamValidationErrors: Record<
    string,
    { reason?: string; offendingPlayerIds?: string[] } | undefined
  >;
  discordSentStatus: Record<
    string,
    { sent: boolean; sentAt?: string; customMessage?: string }
  >;
}

export function useCompositionSummary({
  tabValue,
  equipesByType,
  compositions,
  players,
  selectedJournee,
  selectedPhase,
  isParis,
  teamValidationErrors,
  discordSentStatus,
}: UseCompositionSummaryOptions) {
  // Fonction pour trouver le match correspondant à une équipe
  const getMatchForTeam = useCallback(
    (equipe: EquipeWithMatches) => {
      if (selectedJournee === null || selectedPhase === null) {
        return null;
      }
      return (
        getMatchForTeamAndJournee(
          equipe,
          selectedJournee,
          selectedPhase
        ) || null
      );
    },
    [selectedJournee, selectedPhase]
  );

  // Calculer le summary des compositions
  const compositionSummary = useMemo(() => {
    // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
    const currentTypeEquipes = isParis
      ? [...equipesByType.masculin, ...equipesByType.feminin]
      : tabValue === 0
      ? equipesByType.masculin
      : equipesByType.feminin;

    let equipesCompletes = 0;
    let equipesIncompletes = 0;
    let equipesInvalides = 0;
    let equipesMatchsJoues = 0;

    currentTypeEquipes.forEach((equipe) => {
      const match = getMatchForTeam(equipe);
      const matchPlayed = isMatchPlayed(match);

      if (matchPlayed) {
        equipesMatchsJoues += 1;
        return;
      }

      const teamPlayers =
        compositions[equipe.team.id]?.map((playerId) =>
          players.find((p) => p.id === playerId)
        ) ?? [];
      const teamPlayersData = teamPlayers.filter(
        (p): p is Player => p !== undefined
      );

      const validationError = teamValidationErrors[equipe.team.id];

      if (validationError) {
        equipesInvalides += 1;
        return;
      }

      if (teamPlayersData.length >= 4) {
        equipesCompletes += 1;
      } else {
        equipesIncompletes += 1;
      }
    });

    const totalEditable =
      equipesCompletes + equipesIncompletes + equipesInvalides;
    const percentage =
      totalEditable > 0
        ? Math.round((equipesCompletes / totalEditable) * 100)
        : 0;

    return {
      totalEditable,
      equipesCompletes,
      equipesIncompletes,
      equipesInvalides,
      equipesMatchsJoues,
      percentage,
    };
  }, [
    tabValue,
    equipesByType,
    compositions,
    players,
    getMatchForTeam,
    isParis,
    teamValidationErrors,
  ]);

  // Calculer les stats Discord pour le summary
  const discordStats = useMemo(() => {
    const currentTypeEquipes = isParis
      ? [...equipesByType.masculin, ...equipesByType.feminin]
      : tabValue === 0
      ? equipesByType.masculin
      : equipesByType.feminin;

    const sent = currentTypeEquipes.filter((equipe) => {
      const match = getMatchForTeam(equipe);
      const matchPlayed = isMatchPlayed(match);
      return (
        !matchPlayed && discordSentStatus[equipe.team.id]?.sent === true
      );
    }).length;

    const total = currentTypeEquipes.filter((equipe) => {
      const match = getMatchForTeam(equipe);
      return !isMatchPlayed(match);
    }).length;

    return { sent, total };
  }, [
    isParis,
    tabValue,
    equipesByType,
    getMatchForTeam,
    discordSentStatus,
  ]);

  return {
    compositionSummary,
    discordStats,
    getMatchForTeam,
  };
}

