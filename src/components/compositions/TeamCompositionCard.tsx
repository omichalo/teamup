"use client";

import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";

export interface TeamCompositionCardProps {
  equipe: EquipeWithMatches;
  players: Player[];
  onRemovePlayer: (playerId: string) => void;
  onPlayerDragStart?: (event: React.DragEvent, playerId: string) => void;
  onPlayerDragEnd?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent) => void;
  isDragOver?: boolean;
  canDrop?: boolean;
  dropReason?: string | undefined;
  draggedPlayerId?: string | null;
  dragOverTeamId?: string | null;
  matchPlayed?: boolean;
  showMatchStatus?: boolean;
  additionalHeader?: React.ReactNode;
  maxPlayers?: number;
  completionThreshold?: number;
  renderPlayerIndicators?: (player: Player) => React.ReactNode;
  renderPlayerSecondary?: (player: Player) => React.ReactNode;
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
  matchPlayed = false,
  showMatchStatus = true,
  additionalHeader,
  maxPlayers = DEFAULT_MAX_PLAYERS,
  completionThreshold: completionThresholdProp,
  renderPlayerIndicators,
  renderPlayerSecondary,
}) => {
  const teamPlayersCount = players.length;
  const completionThreshold =
    completionThresholdProp !== undefined
      ? completionThresholdProp
      : maxPlayers;
  const cardClassName =
    isDragOver && draggedPlayerId
      ? canDrop
        ? "droppable--over"
        : "droppable--blocked"
      : undefined;

  return (
    <Card
      elevation={0}
      {...(cardClassName ? { className: cardClassName } : {})}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        position: "relative",
        cursor:
          dragOverTeamId === equipe.team.id && draggedPlayerId
            ? canDrop
              ? "grab"
              : "not-allowed"
            : undefined,
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6">{equipe.team.name}</Typography>
            {showMatchStatus && matchPlayed && (
              <Chip
                label="Match joué"
                size="small"
                color="info"
                variant="filled"
              />
            )}
            {additionalHeader}
          </Box>
          <Chip
            label={`${teamPlayersCount}/${maxPlayers} joueurs`}
            size="small"
            color={
              teamPlayersCount >= completionThreshold ? "success" : "default"
            }
            variant={
              teamPlayersCount >= completionThreshold ? "filled" : "outlined"
            }
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

        {dropReason && isDragOver && !canDrop && (
          <Box
            sx={{
              py: 1,
              px: 2,
              mb: 2,
              backgroundColor: "error.main",
              color: "error.contrastText",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            <Typography variant="caption" fontWeight="bold">
              ❌ {dropReason}
            </Typography>
          </Box>
        )}

        {players.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              py: 2,
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Déposez des joueurs ici
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 1,
            }}
          >
            {players.map((player) => (
              <Box
                key={player.id}
                draggable={!matchPlayed}
                onDragStart={
                  !matchPlayed && onPlayerDragStart
                    ? (event) => onPlayerDragStart(event, player.id)
                    : undefined
                }
                onDragEnd={
                  !matchPlayed && onPlayerDragEnd
                    ? (event) => onPlayerDragEnd(event)
                    : undefined
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  p: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  position: "relative",
                  cursor: matchPlayed ? "default" : "grab",
                  backgroundColor: "background.paper",
                  "&:hover": {
                    backgroundColor: matchPlayed
                      ? "background.paper"
                      : "action.hover",
                    borderColor: matchPlayed ? "divider" : "primary.main",
                    boxShadow: matchPlayed ? "none" : 1,
                  },
                  "&:active": {
                    cursor: matchPlayed ? "default" : "grabbing",
                    opacity: matchPlayed ? 1 : 0.7,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <DragIndicator
                      fontSize="small"
                      color="disabled"
                      sx={{ cursor: matchPlayed ? "default" : "grab" }}
                    />
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ fontWeight: 600 }}
                    >
                      {player.firstName} {player.name}
                    </Typography>
                    {renderPlayerIndicators?.(player)}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {renderPlayerSecondary
                      ? renderPlayerSecondary(player)
                      : `${
                          player.points !== undefined && player.points !== null
                            ? player.points
                            : "?"
                        } points`}
                  </Typography>
                </Box>
                {!matchPlayed && (
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
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
