"use client";

import { Box, Chip } from "@mui/material";
import { ChampionshipStatusChips } from "@/components/championship/ChampionshipStatusChips";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import { isParisChampionship } from "@/lib/compositions/validators";
import type { Player } from "@/types/team-management";

type DropCheck = { canAssign: boolean; reason?: string };

type Props = {
  equipe: EquipeWithMatches;
  teamPlayers: Player[];
  validationError?: string | undefined;
  selectedPhase: "aller" | "retour" | null;
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  selectedPlayerId: string | null;
  dragEnabled: boolean;
  canDropPlayer: (playerId: string, teamId: string) => DropCheck;
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent, teamId: string) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent, teamId: string) => void;
  onSelectPlayer: (playerId: string) => void;
  onTeamTap: (teamId: string) => void;
  onRemovePlayer: (teamId: string, playerId: string) => void;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  completionThreshold: number;
  burnoutKind: "masculin" | "feminin" | "auto";
  getDiscordStatus: (player: Player) => "none" | "invalid" | "valid";
};

export function DefaultCompositionTeamCard({
  equipe,
  teamPlayers,
  validationError,
  selectedPhase,
  draggedPlayerId,
  dragOverTeamId,
  selectedPlayerId,
  dragEnabled,
  canDropPlayer,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectPlayer,
  onTeamTap,
  onRemovePlayer,
  getMaxPlayersForTeam,
  completionThreshold,
  burnoutKind,
  getDiscordStatus,
}: Props) {
  const previewPlayerId = draggedPlayerId ?? selectedPlayerId;
  const isSelectionPreview = Boolean(selectedPlayerId && !draggedPlayerId);
  const isDragOver =
    Boolean(previewPlayerId) &&
    (isSelectionPreview || dragOverTeamId === equipe.team.id);
  const dropCheck =
    previewPlayerId && isDragOver
      ? canDropPlayer(previewPlayerId, equipe.team.id)
      : { canAssign: true, reason: undefined };
  const canDrop = dropCheck.canAssign;

  return (
    <Box>
      <TeamCompositionCard
        equipe={equipe}
        players={teamPlayers}
        onRemovePlayer={(playerId) => onRemovePlayer(equipe.team.id, playerId)}
        onPlayerDragStart={(event, playerId) => onDragStart(event, playerId)}
        onPlayerDragEnd={onDragEnd}
        onDragOver={
          dragEnabled
            ? (event) => onDragOver(event, equipe.team.id)
            : undefined
        }
        onDragLeave={dragEnabled ? onDragLeave : undefined}
        onDrop={
          dragEnabled ? (event) => onDrop(event, equipe.team.id) : undefined
        }
        isDragOver={Boolean(isDragOver)}
        canDrop={canDrop}
        dropReason={dropCheck.reason}
        draggedPlayerId={draggedPlayerId}
        dragOverTeamId={dragOverTeamId}
        selectedPlayerId={selectedPlayerId}
        dragEnabled={dragEnabled}
        onSelectPlayer={onSelectPlayer}
        onTeamTap={onTeamTap}
        matchPlayed={false}
        showMatchStatus={false}
        selectedEpreuve={null}
        additionalHeader={
          validationError ? (
            <Chip label="Invalide" size="small" color="error" variant="filled" />
          ) : undefined
        }
        maxPlayers={getMaxPlayersForTeam(equipe)}
        completionThreshold={completionThreshold}
        renderPlayerIndicators={(player) => {
          const phase = (selectedPhase || "aller") as "aller" | "retour";
          const isParis = isParisChampionship(equipe);
          const burnedTeam = isParis
            ? player.highestTeamNumberByPhaseParis?.[phase]
            : burnoutKind === "masculin"
              ? player.highestMasculineTeamNumberByPhase?.[phase]
              : burnoutKind === "feminin"
                ? player.highestFeminineTeamNumberByPhase?.[phase]
                : player.highestMasculineTeamNumberByPhase?.[phase];
          const discordStatus = getDiscordStatus(player);
          return (
            <>
              <ChampionshipStatusChips player={player} />
              {player.nationality === "C" ? (
                <Chip
                  label="EUR"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
              {player.nationality === "ETR" ? (
                <Chip
                  label="ETR"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
              {burnedTeam !== undefined && burnedTeam !== null ? (
                <Chip
                  label={`Brûlé Éq. ${burnedTeam}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
              {discordStatus === "none" ? (
                <Chip
                  label="Pas Discord"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
              {discordStatus === "invalid" ? (
                <Chip
                  label="Discord invalide"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
            </>
          );
        }}
      />
      {validationError ? (
        <Box sx={{ mt: 1, color: "error.main", typography: "caption" }}>
          {validationError}
        </Box>
      ) : null}
    </Box>
  );
}
