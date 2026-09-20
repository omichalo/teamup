"use client";

import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { DragIndicator, Accessible as AccessibleIcon } from "@mui/icons-material";
import type { Player } from "@/types/team-management";

export type TeamCompositionAssignedPlayerProps = {
  player: Player;
  matchPlayed: boolean;
  dragEnabled: boolean;
  isSelected: boolean;
  onPlayerDragStart?: ((event: React.DragEvent, playerId: string) => void) | undefined;
  onPlayerDragEnd?: ((event: React.DragEvent) => void) | undefined;
  onSelectPlayer?: ((playerId: string) => void) | undefined;
  onRemovePlayer: (playerId: string) => void;
  renderPlayerIndicators?: ((player: Player) => React.ReactNode) | undefined;
  renderPlayerSecondary?: ((player: Player) => React.ReactNode) | undefined;
};

export function TeamCompositionAssignedPlayer({
  player,
  matchPlayed,
  dragEnabled,
  isSelected,
  onPlayerDragStart,
  onPlayerDragEnd,
  onSelectPlayer,
  onRemovePlayer,
  renderPlayerIndicators,
  renderPlayerSecondary,
}: TeamCompositionAssignedPlayerProps) {
  const canInteract = !matchPlayed;

  return (
    <Box
      draggable={canInteract && dragEnabled}
      onDragStart={
        canInteract && dragEnabled && onPlayerDragStart
          ? (event) => onPlayerDragStart(event, player.id)
          : undefined
      }
      onDragEnd={
        canInteract && dragEnabled && onPlayerDragEnd
          ? (event) => onPlayerDragEnd(event)
          : undefined
      }
      onClick={
        canInteract && onSelectPlayer
          ? (event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest('[data-chip="remove"]') ||
                target.closest('button[aria-label*="remove"]')
              ) {
                return;
              }
              event.stopPropagation();
              onSelectPlayer(player.id);
            }
          : undefined
      }
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        p: 1,
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        borderRadius: 1,
        position: "relative",
        cursor: matchPlayed ? "default" : dragEnabled ? "grab" : "pointer",
        backgroundColor: isSelected ? "action.selected" : "background.paper",
        boxShadow: isSelected ? 1 : "none",
        "&:hover": {
          backgroundColor: matchPlayed ? "background.paper" : "action.hover",
          borderColor: matchPlayed ? "divider" : "primary.main",
          boxShadow: matchPlayed ? "none" : 1,
        },
        "&:active": {
          cursor: matchPlayed ? "default" : dragEnabled ? "grabbing" : "pointer",
          opacity: matchPlayed ? 1 : 0.7,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          {dragEnabled ? (
            <DragIndicator
              fontSize="small"
              color="disabled"
              sx={{ cursor: matchPlayed ? "default" : "grab" }}
            />
          ) : null}
          <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
            {player.firstName} {player.name}
          </Typography>
          {player.isWheelchair ? (
            <Tooltip title="Joueur en fauteuil">
              <AccessibleIcon fontSize="small" sx={{ color: "primary.main", ml: 0.5 }} />
            </Tooltip>
          ) : null}
          {renderPlayerIndicators?.(player)}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {renderPlayerSecondary
            ? renderPlayerSecondary(player)
            : `${player.points !== undefined && player.points !== null ? player.points : "?"} points`}
        </Typography>
      </Box>
      {!matchPlayed ? (
        <Chip
          label="×"
          size="small"
          color="default"
          data-chip="remove"
          draggable={false}
          onDragStart={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onRemovePlayer(player.id);
          }}
          sx={{
            cursor: "pointer",
            minWidth: 24,
            height: 24,
            fontWeight: 700,
            "&:hover": {
              backgroundColor: "error.main",
              color: "error.contrastText",
            },
          }}
        />
      ) : null}
    </Box>
  );
}
