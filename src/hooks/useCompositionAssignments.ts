import { useCallback } from "react";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { usePlayerDrag } from "@/hooks/usePlayerDrag";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  AssignmentValidationResult,
  canAssignPlayerToTeam,
  isParisChampionship,
} from "@/lib/compositions/validators";
import { ChampionshipType } from "@/types";
import { Player } from "@/types/team-management";
import { CompositionService } from "@/lib/services/composition-service";

interface UseCompositionAssignmentsParams {
  players: Player[];
  equipes: EquipeWithMatches[];
  filteredEquipes: EquipeWithMatches[];
  compositions: Record<string, string[]>;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  tabValue: number;
  compositionService: CompositionService;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  setCompositions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setDefaultCompositions: React.Dispatch<
    React.SetStateAction<{
      masculin: Record<string, string[]>;
      feminin: Record<string, string[]>;
    }>
  >;
}

export function useCompositionAssignments({
  players,
  equipes,
  filteredEquipes,
  compositions,
  selectedPhase,
  selectedJournee,
  tabValue,
  compositionService,
  getMaxPlayersForTeam,
  setCompositions,
  setDefaultCompositions,
}: UseCompositionAssignmentsParams) {
  const canDropPlayer = useCallback(
    (playerId: string, teamId: string): AssignmentValidationResult => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : 4;
      const championshipType: ChampionshipType =
        equipe && equipe.matches.some((match) => match.isFemale === true)
          ? "feminin"
          : "masculin";

      return canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions,
        selectedPhase,
        selectedJournee,
        championshipType,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });
    },
    [
      compositions,
      equipes,
      getMaxPlayersForTeam,
      players,
      selectedJournee,
      selectedPhase,
    ]
  );

  const getDragPreviewOptions = useCallback(
    (playerId: string) => {
      const equipe = filteredEquipes.find((eq) => {
        const teamPlayers = compositions[eq.team.id] || [];
        return teamPlayers.includes(playerId);
      });

      const championshipType: ChampionshipType = equipe
        ? equipe.matches.some((match) => match.isFemale === true)
          ? "feminin"
          : "masculin"
        : tabValue === 0
        ? "masculin"
        : "feminin";

      return {
        championshipType,
        phase: (selectedPhase || "aller") as "aller" | "retour",
      };
    },
    [compositions, filteredEquipes, selectedPhase, tabValue]
  );

  const handlePlayerDrop = useCallback(
    async (teamId: string, playerId: string) => {
      const player = players.find((p) => p.id === playerId);
      const equipe = equipes.find((eq) => eq.team.id === teamId);

      if (!player || !equipe) {
        return;
      }

      const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
      const championshipType: ChampionshipType = isFemaleTeam ? "feminin" : "masculin";

      setCompositions((prev) => {
        const equipeForMax = equipes.find((e) => e.team.id === teamId);
        const maxPlayers = equipeForMax ? getMaxPlayersForTeam(equipeForMax) : 4;

        const latestValidation = canAssignPlayerToTeam({
          playerId,
          teamId,
          players,
          equipes,
          compositions: prev,
          selectedPhase,
          selectedJournee,
          championshipType,
          journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
          maxPlayersPerTeam: maxPlayers,
        });

        if (!latestValidation.canAssign) return prev;

        const currentTeamPlayers = prev[teamId] || [];
        if (currentTeamPlayers.includes(playerId)) return prev;

        const updatedCompositions = { ...prev };
        const sameTypeEquipes = filteredEquipes.filter((eq) => {
          const eqIsFemale = eq.matches.some((match) => match.isFemale === true);
          return eqIsFemale === isFemaleTeam;
        });

        sameTypeEquipes.forEach((eq) => {
          if (updatedCompositions[eq.team.id]) {
            updatedCompositions[eq.team.id] = updatedCompositions[eq.team.id].filter(
              (id) => id !== playerId
            );
          }
        });

        const targetTeamPlayers = updatedCompositions[teamId] || [];
        if (targetTeamPlayers.length >= maxPlayers) return prev;

        const isParis = isParisChampionship(equipe);
        if (!isParis && player.nationality === "ETR") {
          const targetTeamPlayersData = targetTeamPlayers
            .map((pid) => players.find((p) => p.id === pid))
            .filter((p): p is Player => p !== undefined);
          const hasForeignPlayer = targetTeamPlayersData.some(
            (p) => p.nationality === "ETR"
          );
          if (hasForeignPlayer) return prev;
        }

        const newCompositions = {
          ...updatedCompositions,
          [teamId]: [...targetTeamPlayers, playerId],
        };

        setDefaultCompositions((prevDefaults) => ({
          ...prevDefaults,
          [championshipType]: newCompositions,
        }));

        if (selectedJournee !== null && selectedPhase !== null) {
          const saveComposition = async () => {
            try {
              await compositionService.saveComposition({
                journee: selectedJournee,
                phase: selectedPhase,
                championshipType,
                teams: newCompositions,
              });
            } catch (error) {
              console.error("Erreur lors de la sauvegarde:", error);
            }
          };
          void saveComposition();
        }

        return newCompositions;
      });
    },
    [
      compositionService,
      equipes,
      filteredEquipes,
      getMaxPlayersForTeam,
      players,
      selectedJournee,
      selectedPhase,
      setCompositions,
      setDefaultCompositions,
    ]
  );

  const handleRemovePlayer = useCallback(
    (teamId: string, playerId: string) => {
      setCompositions((prev) => {
        const currentTeamPlayers = prev[teamId] || [];
        const equipe = filteredEquipes.find((eq) => eq.team.id === teamId);
        const isFemaleTeam = equipe?.matches.some((match) => match.isFemale === true);
        const championshipType: ChampionshipType = isFemaleTeam ? "feminin" : "masculin";

        const newCompositions = {
          ...prev,
          [teamId]: currentTeamPlayers.filter((id) => id !== playerId),
        };

        setDefaultCompositions((prevDefaults) => ({
          ...prevDefaults,
          [championshipType]: newCompositions,
        }));

        if (selectedJournee !== null && selectedPhase !== null) {
          const saveComposition = async () => {
            try {
              await compositionService.saveComposition({
                journee: selectedJournee,
                phase: selectedPhase,
                championshipType,
                teams: newCompositions,
              });
            } catch (error) {
              console.error("Erreur lors de la sauvegarde:", error);
            }
          };
          void saveComposition();
        }

        return newCompositions;
      });
    },
    [
      compositionService,
      filteredEquipes,
      selectedJournee,
      selectedPhase,
      setCompositions,
      setDefaultCompositions,
    ]
  );

  const drag = usePlayerDrag({
    players,
    canDropPlayer,
    getPreviewOptions: getDragPreviewOptions,
    onDrop: handlePlayerDrop,
  });

  return {
    canDropPlayer,
    handleRemovePlayer,
    ...drag,
  };
}
