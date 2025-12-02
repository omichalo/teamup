import { useEffect, useState } from "react";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { validateTeamCompositionState, JOURNEE_CONCERNEE_PAR_REGLE } from "@/lib/compositions/validation";
import { useMaxPlayersForTeam } from "./useMaxPlayersForTeam";

interface UseCompositionValidationOptions {
  filteredEquipes: EquipeWithMatches[];
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: Record<string, string[]>;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  availabilities: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  };
  loadingEquipes: boolean;
  loadingPlayers: boolean;
  isParis?: boolean;
}

interface ValidationError {
  reason: string;
  offendingPlayerIds?: string[];
}

/**
 * Hook pour valider les compositions d'équipes et détecter les erreurs
 */
export function useCompositionValidation(options: UseCompositionValidationOptions) {
  const {
    filteredEquipes,
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    availabilities,
    loadingEquipes,
    loadingPlayers,
    isParis = false,
  } = options;

  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, ValidationError | undefined>
  >({});

  useEffect(() => {
    if (
      loadingEquipes ||
      loadingPlayers ||
      selectedPhase === null ||
      selectedJournee === null
    ) {
      setValidationErrors({});
      return;
    }

    const nextErrors: Record<string, ValidationError | undefined> = {};

    filteredEquipes.forEach((equipe) => {
      const maxPlayers = getMaxPlayersForTeam(equipe);
      const validation = validateTeamCompositionState({
        teamId: equipe.team.id,
        players,
        equipes,
        compositions,
        selectedPhase,
        selectedJournee,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });

      if (!validation.valid) {
        const errorInfo: ValidationError = {
          reason: validation.reason || "Composition invalide",
        };
        if (validation.offendingPlayerIds) {
          errorInfo.offendingPlayerIds = validation.offendingPlayerIds;
        }
        nextErrors[equipe.team.id] = errorInfo;
      }

      const championshipType = equipe.matches.some(
        (match) => match.isFemale === true
      )
        ? "feminin"
        : "masculin";
      const availabilityMap =
        (championshipType === "masculin"
          ? availabilities.masculin
          : availabilities.feminin) || {};
      const teamPlayerIds = compositions[equipe.team.id] || [];
      const unavailablePlayers = teamPlayerIds.filter((playerId) => {
        const availability = availabilityMap[playerId];
        return !availability || availability.available !== true;
      });

      if (unavailablePlayers.length > 0) {
        const unavailablePlayerNames = unavailablePlayers
          .map((playerId) => players.find((p) => p.id === playerId))
          .filter((p): p is Player => p !== undefined)
          .map((p) => `${p.firstName} ${p.name}`);

        const reasonText =
          unavailablePlayerNames.length > 0
            ? `Joueur${
                unavailablePlayerNames.length > 1 ? "s" : ""
              } indisponible${
                unavailablePlayerNames.length > 1 ? "s" : ""
              }: ${unavailablePlayerNames.join(", ")}`
            : "Un ou plusieurs joueurs de cette équipe ne sont pas disponibles.";

        const existing = nextErrors[equipe.team.id];
        if (existing) {
          const hasReason = existing.reason.includes(reasonText);
          existing.reason = hasReason
            ? existing.reason
            : `${existing.reason} • ${reasonText}`;
          existing.offendingPlayerIds = Array.from(
            new Set([
              ...(existing.offendingPlayerIds ?? []),
              ...unavailablePlayers,
            ])
          );
        } else {
          nextErrors[equipe.team.id] = {
            reason: reasonText,
            offendingPlayerIds: unavailablePlayers,
          };
        }
      }
    });

    setValidationErrors(nextErrors);
  }, [
    compositions,
    equipes,
    players,
    loadingEquipes,
    loadingPlayers,
    selectedPhase,
    selectedJournee,
    availabilities,
    filteredEquipes,
    getMaxPlayersForTeam,
  ]);

  return { validationErrors };
}

