"use client";

import { Chip, Tooltip } from "@mui/material";
import { AlternateEmail, Warning } from "@mui/icons-material";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import { getDiscordStatus } from "@/lib/compositions/discord-utils";
import type { DiscordMember } from "@/types/discord";
import { extractTeamNumber, calculateFutureBurnout } from "@/lib/compositions/validation";
import type { PhaseType } from "@/lib/compositions/validation";

interface PlayerBurnoutIndicatorsProps {
  player: Player;
  equipe: EquipeWithMatches;
  phase: PhaseType;
  championshipType: "masculin" | "feminin";
  isParis: boolean;
  teamAvailabilityMap?: Record<string, { available?: boolean; comment?: string }>;
  offendingPlayerIds?: string[];
  validationError?: string | undefined;
  discordMembers: DiscordMember[];
}

/**
 * Composant pour afficher les indicateurs de brûlage et autres informations d'un joueur
 */
export function PlayerBurnoutIndicators(props: PlayerBurnoutIndicatorsProps) {
  const {
    player,
    equipe,
    phase,
    championshipType,
    isParis,
    teamAvailabilityMap = {},
    offendingPlayerIds = [],
    validationError,
    discordMembers,
  } = props;

  // Utiliser les bonnes propriétés selon le championnat
  const burnedTeam = isParis
    ? player.highestTeamNumberByPhaseParis?.[phase]
    : championshipType === "masculin"
    ? player.highestMasculineTeamNumberByPhase?.[phase]
    : player.highestFeminineTeamNumberByPhase?.[phase];

  // Calculer le brûlage futur en simulant l'ajout d'un match dans l'équipe cible
  const teamNumber = extractTeamNumber(equipe.team.name);
  const matchesByTeamByPhase = isParis
    ? player.matchesByTeamByPhaseParis?.[phase]
    : championshipType === "masculin"
    ? player.masculineMatchesByTeamByPhase?.[phase]
    : player.feminineMatchesByTeamByPhase?.[phase];

  const futureBurnedTeam =
    teamNumber > 0
      ? calculateFutureBurnout(matchesByTeamByPhase, teamNumber)
      : null;

  // Le joueur sera brûlé si :
  // 1. Le brûlage futur est différent du brûlage actuel (changement d'équipe brûlée)
  // 2. OU le joueur devient brûlé alors qu'il ne l'était pas (actuel = null/undefined, futur ≠ null)
  const willBeBurned =
    futureBurnedTeam !== null &&
    (burnedTeam === null ||
      burnedTeam === undefined ||
      futureBurnedTeam !== burnedTeam);

  const availability = teamAvailabilityMap[player.id];
  const isPlayerAvailable = availability?.available === true;
  const showUnavailableIndicator = !isPlayerAvailable;
  const showJ2Indicator =
    offendingPlayerIds.includes(player.id) &&
    (validationError?.toLowerCase() || "").includes("journée 2") &&
    isPlayerAvailable;

  const discordStatus = getDiscordStatus(player, discordMembers);

  return (
    <>
      {player.nationality === "C" && (
        <Chip
          label="EUR"
          size="small"
          color="info"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {player.nationality === "ETR" && (
        <Chip
          label="ETR"
          size="small"
          color="warning"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {burnedTeam !== undefined && burnedTeam !== null && (
        <Chip
          label={`Brûlé Éq. ${burnedTeam}`}
          size="small"
          color="error"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {willBeBurned && futureBurnedTeam !== null && (
        <Chip
          label={`Sera brûlé Éq. ${futureBurnedTeam}`}
          size="small"
          color="warning"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
          title={
            burnedTeam === null || burnedTeam === undefined
              ? "Ce joueur deviendra brûlé dans cette équipe"
              : `Ce joueur changera d'équipe brûlée (actuellement Éq. ${burnedTeam}, deviendra Éq. ${futureBurnedTeam})`
          }
        />
      )}
      {showUnavailableIndicator && (
        <Chip
          label="Indispo"
          size="small"
          color="error"
          variant="filled"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {showJ2Indicator && (
        <Chip
          label="J2"
          size="small"
          color="error"
          variant="filled"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {player.isTemporary && (
        <Chip
          label="Temporaire"
          size="small"
          color="error"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
          }}
        />
      )}
      {discordStatus === "none" && (
        <Tooltip title="Aucun login Discord configuré">
          <Chip
            icon={<AlternateEmail fontSize="small" />}
            label="Pas Discord"
            size="small"
            color="default"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: "0.65rem",
            }}
          />
        </Tooltip>
      )}
      {discordStatus === "invalid" && (
        <Tooltip title="Au moins un login Discord n'existe plus sur le serveur">
          <Chip
            icon={<Warning fontSize="small" />}
            label="Discord invalide"
            size="small"
            color="warning"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: "0.65rem",
            }}
          />
        </Tooltip>
      )}
    </>
  );
}

