import { useCallback } from "react";
import { usePlayerDrag } from "@/hooks/usePlayerDrag";
import { EpreuveType, isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { ChampionshipType } from "@/types";
import { Player } from "@/types/team-management";
import {
  AssignmentValidationResult,
  JOURNEE_CONCERNEE_PAR_REGLE,
  canAssignPlayerToTeam,
} from "@/lib/compositions/validators";

const MAX_PLAYERS_PER_DEFAULT_TEAM = 5;

interface DefaultCompositionsState {
  masculin: Record<string, string[]>;
  feminin: Record<string, string[]>;
}

interface UseDefaultCompositionAssignmentsParams {
  players: Player[];
  equipes: EquipeWithMatches[];
  equipesByType: { masculin: EquipeWithMatches[]; feminin: EquipeWithMatches[] };
  defaultCompositions: DefaultCompositionsState;
  setDefaultCompositions: React.Dispatch<React.SetStateAction<DefaultCompositionsState>>;
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  defaultCompositionTab: ChampionshipType;
  mergedDefaultCompositions: Record<string, string[]>;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  compositionDefaultsService: CompositionDefaultsService;
  setDefaultCompositionMessage: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useDefaultCompositionAssignments({
  players,
  equipes,
  equipesByType,
  defaultCompositions,
  setDefaultCompositions,
  selectedEpreuve,
  selectedPhase,
  defaultCompositionTab,
  mergedDefaultCompositions,
  getMaxPlayersForTeam,
  compositionDefaultsService,
  setDefaultCompositionMessage,
}: UseDefaultCompositionAssignmentsParams) {
  const canDropPlayer = useCallback(
    (playerId: string, teamId: string): AssignmentValidationResult => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe
        ? getMaxPlayersForTeam(equipe)
        : MAX_PLAYERS_PER_DEFAULT_TEAM;
      const championshipType: ChampionshipType =
        equipe && equipe.matches.some((match) => match.isFemale)
          ? "feminin"
          : "masculin";

      return canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
        championshipType,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });
    },
    [
      players,
      equipes,
      mergedDefaultCompositions,
      selectedPhase,
      getMaxPlayersForTeam,
    ]
  );

  const assignPlayerToTeam = useCallback(
    async (teamId: string, playerId: string): Promise<boolean> => {
      if (selectedPhase === null) {
        setDefaultCompositionMessage(
          "Veuillez sélectionner une phase pour gérer les compositions."
        );
        return false;
      }

      const equipe = equipes.find((eq) => eq.team.id === teamId);
      const player = players.find((p) => p.id === playerId);
      if (!equipe || !player) {
        setDefaultCompositionMessage("Équipe ou joueur introuvable.");
        return false;
      }

      const validation = canDropPlayer(playerId, teamId);
      if (!validation.canAssign) {
        setDefaultCompositionMessage(validation.reason || "Composition invalide.");
        return false;
      }

      const championshipType: ChampionshipType = isParisEpreuve(selectedEpreuve)
        ? "masculin"
        : equipe.matches.some((match) => match.isFemale === true)
        ? "feminin"
        : "masculin";

      const sameTypeTeams = (
        championshipType === "feminin" ? equipesByType.feminin : equipesByType.masculin
      ).map((eq) => eq.team.id);

      const previousAssignments = defaultCompositions[championshipType] || {};
      const updatedForType: Record<string, string[]> = Object.fromEntries(
        Object.entries(previousAssignments).map(([key, value]) => [key, [...value]])
      );

      let removedFromOtherTeams = false;
      sameTypeTeams.forEach((sameTeamId) => {
        const playersForTeam = updatedForType[sameTeamId];
        if (playersForTeam?.includes(playerId)) {
          updatedForType[sameTeamId] = playersForTeam.filter((id) => id !== playerId);
          if (sameTeamId !== teamId) removedFromOtherTeams = true;
        }
      });

      const currentTeamPlayers = [...(updatedForType[teamId] ?? [])];
      if (currentTeamPlayers.includes(playerId)) {
        if (!removedFromOtherTeams) {
          setDefaultCompositionMessage(null);
          return true;
        }

        const nextState = {
          ...defaultCompositions,
          [championshipType]: updatedForType,
        };
        setDefaultCompositions(nextState);
        try {
          await compositionDefaultsService.saveDefaults({
            phase: selectedPhase,
            championshipType,
            teams: updatedForType,
          });
          setDefaultCompositionMessage(null);
          return true;
        } catch {
          setDefaultCompositionMessage(
            "Erreur lors de la sauvegarde de la composition par défaut."
          );
          return false;
        }
      }

      const maxPlayers = equipe
        ? getMaxPlayersForTeam(equipe)
        : MAX_PLAYERS_PER_DEFAULT_TEAM;
      if (currentTeamPlayers.length >= maxPlayers) {
        setDefaultCompositionMessage(
          `Cette équipe est déjà complète (${maxPlayers} joueurs).`
        );
        return false;
      }

      updatedForType[teamId] = [...currentTeamPlayers, playerId];
      setDefaultCompositions({
        ...defaultCompositions,
        [championshipType]: updatedForType,
      });

      try {
        await compositionDefaultsService.saveDefaults({
          phase: selectedPhase,
          championshipType,
          teams: updatedForType,
        });
        setDefaultCompositionMessage(null);
        return true;
      } catch {
        setDefaultCompositionMessage(
          "Erreur lors de la sauvegarde de la composition par défaut."
        );
        return false;
      }
    },
    [
      selectedPhase,
      equipes,
      players,
      canDropPlayer,
      selectedEpreuve,
      equipesByType,
      defaultCompositions,
      setDefaultCompositions,
      compositionDefaultsService,
      getMaxPlayersForTeam,
      setDefaultCompositionMessage,
    ]
  );

  const handleRemoveDefaultPlayer = useCallback(
    async (teamId: string, playerId: string) => {
      if (selectedPhase === null) return;

      const equipe = equipes.find((eq) => eq.team.id === teamId);
      if (!equipe) return;

      const championshipType: ChampionshipType = isParisEpreuve(selectedEpreuve)
        ? "masculin"
        : equipe.matches.some((match) => match.isFemale === true)
        ? "feminin"
        : "masculin";

      let nextTeamsForType: Record<string, string[]> | null = null;
      setDefaultCompositions((prev) => {
        const updatedForType = { ...prev[championshipType] };
        const currentPlayers = updatedForType[teamId] || [];
        if (!currentPlayers.includes(playerId)) {
          nextTeamsForType = updatedForType;
          return prev;
        }
        updatedForType[teamId] = currentPlayers.filter((id) => id !== playerId);
        nextTeamsForType = updatedForType;
        return { ...prev, [championshipType]: updatedForType };
      });

      if (!nextTeamsForType) return;

      try {
        await compositionDefaultsService.saveDefaults({
          phase: selectedPhase,
          championshipType,
          teams: nextTeamsForType,
        });
      } catch {
        setDefaultCompositionMessage(
          "Erreur lors de la sauvegarde de la composition par défaut."
        );
      }
    },
    [
      selectedPhase,
      equipes,
      selectedEpreuve,
      setDefaultCompositions,
      compositionDefaultsService,
      setDefaultCompositionMessage,
    ]
  );

  const getDragPreviewOptions = useCallback(
    (playerId: string) => {
      let championshipType: ChampionshipType = defaultCompositionTab;
      (["masculin", "feminin"] as const).forEach((type) => {
        const assignment = defaultCompositions[type];
        if (Object.values(assignment).some((ids) => ids?.includes(playerId))) {
          championshipType = type;
        }
      });
      return {
        championshipType,
        phase: (selectedPhase || "aller") as "aller" | "retour",
      };
    },
    [defaultCompositionTab, defaultCompositions, selectedPhase]
  );

  const drag = usePlayerDrag({
    players,
    canDropPlayer,
    getPreviewOptions: getDragPreviewOptions,
    onDrop: async (teamId, playerId) => {
      await assignPlayerToTeam(teamId, playerId);
    },
    onInvalidDrop: (validation) => {
      setDefaultCompositionMessage(validation.reason || "Composition invalide.");
    },
  });

  return {
    canDropPlayer,
    handleRemoveDefaultPlayer,
    ...drag,
  };
}
