"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { TeamCompositionAssignedPlayer } from "./TeamCompositionAssignedPlayer";

export interface TeamCompositionCardProps {
  equipe: EquipeWithMatches;
  players: Player[];
  onRemovePlayer: (playerId: string) => void;
  onPlayerDragStart?: ((event: React.DragEvent, playerId: string) => void) | undefined;
  onPlayerDragEnd?: ((event: React.DragEvent) => void) | undefined;
  onDragOver?: ((event: React.DragEvent) => void) | undefined;
  onDragLeave?: (() => void) | undefined;
  onDrop?: ((event: React.DragEvent) => void) | undefined;
  isDragOver?: boolean;
  canDrop?: boolean;
  dropReason?: string | undefined;
  draggedPlayerId?: string | null;
  dragOverTeamId?: string | null;
  selectedPlayerId?: string | null;
  dragEnabled?: boolean;
  onSelectPlayer?: ((playerId: string) => void) | undefined;
  onTeamTap?: ((teamId: string) => void) | undefined;
  matchPlayed?: boolean;
  showMatchStatus?: boolean;
  additionalHeader?: React.ReactNode | undefined;
  maxPlayers?: number;
  completionThreshold?: number;
  renderPlayerIndicators?: ((player: Player) => React.ReactNode) | undefined;
  renderPlayerSecondary?: ((player: Player) => React.ReactNode) | undefined;
  selectedEpreuve?: EpreuveType | null;
}

const DEFAULT_MAX_PLAYERS = 4;

export const TeamCompositionCard: React.FC<TeamCompositionCardProps> = ({
  equipe,
  players,
  onRemovePlayer,
  onPlayerDragStart,
  onPlayerDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
  canDrop = true,
  dropReason,
  draggedPlayerId,
  dragOverTeamId,
  selectedPlayerId = null,
  dragEnabled = true,
  onSelectPlayer,
  onTeamTap,
  matchPlayed = false,
  showMatchStatus = true,
  additionalHeader,
  maxPlayers = DEFAULT_MAX_PLAYERS,
  completionThreshold: completionThresholdProp,
  renderPlayerIndicators,
  renderPlayerSecondary,
  selectedEpreuve,
}) => {
  const teamPlayersCount = players.length;
  const completionThreshold =
    completionThresholdProp !== undefined ? completionThresholdProp : maxPlayers;
  const previewPlayerId = draggedPlayerId ?? selectedPlayerId;
  const cardClassName =
    isDragOver && previewPlayerId
      ? canDrop
        ? "droppable--over"
        : "droppable--blocked"
      : undefined;
  const isParisChampionship = selectedEpreuve === "championnat_paris";
  const selectionMode = Boolean(selectedPlayerId);

  const groupedPlayers = useMemo(() => {
    const sortedPlayers = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    if (isParisChampionship) {
      const groups: Player[][] = [];
      for (let i = 0; i < sortedPlayers.length; i += 3) {
        groups.push(sortedPlayers.slice(i, i + 3));
      }
      return groups;
    }
    return [sortedPlayers];
  }, [players, isParisChampionship]);

  const activePreview =
    dragOverTeamId === equipe.team.id && previewPlayerId
      ? canDrop
        ? "grab"
        : "not-allowed"
      : selectionMode
        ? "pointer"
        : undefined;

  return (
    <Card
      elevation={0}
      {...(cardClassName ? { className: cardClassName } : {})}
      onDragOver={dragEnabled ? onDragOver : undefined}
      onDragLeave={dragEnabled ? onDragLeave : undefined}
      onDrop={dragEnabled ? onDrop : undefined}
      onClick={
        selectedPlayerId && onTeamTap && !matchPlayed
          ? () => onTeamTap(equipe.team.id)
          : undefined
      }
      sx={{
        position: "relative",
        cursor: activePreview,
        border: "2px dashed",
        borderColor: matchPlayed
          ? "info.main"
          : teamPlayersCount >= completionThreshold
            ? "success.main"
            : isDragOver
              ? canDrop
                ? "primary.main"
                : "error.main"
              : "divider",
        opacity: isDragOver && !canDrop ? 0.6 : 1,
        transition: "opacity 0.2s ease-in-out, border-color 0.2s ease-in-out",
        backgroundColor: matchPlayed
          ? "action.disabledBackground"
          : "background.paper",
        boxShadow: "none",
        "&:hover": {
          borderColor: matchPlayed
            ? "info.main"
            : teamPlayersCount >= completionThreshold
              ? "success.main"
              : isDragOver
                ? canDrop
                  ? "primary.main"
                  : "error.main"
                : "primary.main",
          backgroundColor: matchPlayed
            ? "action.disabledBackground"
            : "action.hover",
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h6">{equipe.team.name}</Typography>
            {showMatchStatus && matchPlayed && (
              <Chip label="Match joué" size="small" color="info" variant="filled" />
            )}
            {additionalHeader}
          </Box>
          <Chip
            label={`${teamPlayersCount}/${maxPlayers} joueurs`}
            size="small"
            color={teamPlayersCount >= completionThreshold ? "success" : "default"}
            variant={teamPlayersCount >= completionThreshold ? "filled" : "outlined"}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {matchPlayed && showMatchStatus && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 2, display: "block", fontStyle: "italic" }}
          >
            Composition verrouillée (match joué)
          </Typography>
        )}

        {dropReason && isDragOver && (
          <Box
            sx={{
              py: 1,
              px: 2,
              mb: 2,
              backgroundColor: canDrop
                ? dropReason.includes("⚠️") || dropReason.includes("Attention")
                  ? "warning.main"
                  : "info.main"
                : "error.main",
              color: canDrop
                ? dropReason.includes("⚠️") || dropReason.includes("Attention")
                  ? "warning.contrastText"
                  : "info.contrastText"
                : "error.contrastText",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            <Typography variant="caption" fontWeight="bold">
              {!canDrop ? "❌" : dropReason.includes("⚠️") ? "⚠️" : "ℹ️"} {dropReason}
            </Typography>
          </Box>
        )}

        {players.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 2, textAlign: "center", fontStyle: "italic" }}
          >
            {selectionMode
              ? "Tapez ici pour assigner le joueur sélectionné"
              : "Déposez des joueurs ici"}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: isParisChampionship ? 2 : 1,
            }}
          >
            {groupedPlayers.map((group, groupIndex) => (
              <Box
                key={groupIndex}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1,
                  ...(isParisChampionship && {
                    p: 1.5,
                    border: "2px solid",
                    borderColor: "primary.light",
                    borderRadius: 2,
                    backgroundColor: "action.hover",
                    boxShadow: 1,
                  }),
                }}
              >
                {isParisChampionship && (
                  <Box
                    sx={{
                      gridColumn: { xs: "1 / -1", sm: "1 / -1" },
                      mb: -0.5,
                    }}
                  >
                    <Chip
                      label={`Groupe ${groupIndex + 1}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                    />
                  </Box>
                )}
                {group.map((player) => (
                  <TeamCompositionAssignedPlayer
                    key={player.id}
                    player={player}
                    matchPlayed={matchPlayed}
                    dragEnabled={dragEnabled}
                    isSelected={selectedPlayerId === player.id}
                    onPlayerDragStart={onPlayerDragStart}
                    onPlayerDragEnd={onPlayerDragEnd}
                    onSelectPlayer={onSelectPlayer}
                    onRemovePlayer={onRemovePlayer}
                    renderPlayerIndicators={renderPlayerIndicators}
                    renderPlayerSecondary={renderPlayerSecondary}
                  />
                ))}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
