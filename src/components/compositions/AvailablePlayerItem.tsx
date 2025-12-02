"use client";

import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Chip,
  Tooltip,
} from "@mui/material";
import { DragIndicator, AlternateEmail, Warning } from "@mui/icons-material";
import type { Player } from "@/types/team-management";
import type { PhaseType } from "@/lib/compositions/validation";
import type { ChampionshipType } from "@/hooks/useChampionshipTypes";
import { getBurnedTeamNumber } from "@/lib/compositions/player-burnout-utils";
import { getDiscordStatus } from "@/lib/compositions/discord-utils";
import type { DiscordMember } from "@/types/discord";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface AvailablePlayerItemProps {
  player: Player;
  phase: PhaseType;
  championshipType: ChampionshipType;
  isParis: boolean;
  selectedEpreuve: EpreuveType | null;
  draggedPlayerId: string | null;
  discordMembers: DiscordMember[];
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
}

/**
 * Composant pour afficher un joueur dans la liste des joueurs disponibles
 */
export function AvailablePlayerItem(props: AvailablePlayerItemProps) {
  const {
    player,
    phase,
    championshipType,
    isParis,
    selectedEpreuve,
    draggedPlayerId,
    discordMembers,
    onDragStart,
    onDragEnd,
  } = props;

  const burnedTeam = getBurnedTeamNumber(player, phase, championshipType, isParis);
  const isForeign = player.nationality === "ETR";
  const isEuropean = player.nationality === "C";
  const discordStatus = getDiscordStatus(player, discordMembers);

  // Afficher le chip "Hors championnat" selon l'épreuve sélectionnée
  const isOutOfChampionship =
    selectedEpreuve === "championnat_paris"
      ? !player.participation?.championnatParis
      : !player.participation?.championnat;

  return (
    <ListItem disablePadding sx={{ mb: 1 }} secondaryAction={null}>
      <ListItemButton
        draggable
        onDragStart={(event) => onDragStart(event, player.id)}
        onDragEnd={onDragEnd}
        sx={{
          cursor: "grab",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          backgroundColor: "background.paper",
          "&:hover": {
            backgroundColor: "action.hover",
            borderColor: "primary.main",
            boxShadow: 1,
            cursor: "grab",
          },
          "&:active": {
            cursor: "grabbing",
            opacity: 0.6,
          },
        }}
      >
        <IconButton
          edge="start"
          size="small"
          sx={{
            mr: 1,
            color: "text.secondary",
            cursor: draggedPlayerId === player.id ? "grabbing" : "grab",
            "&:hover": {
              cursor: "grab",
            },
            "&:active": {
              cursor: "grabbing",
            },
          }}
          disabled
        >
          <DragIndicator fontSize="small" />
        </IconButton>
        <ListItemText
          primary={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" component="span">
                {player.firstName} {player.name}
              </Typography>
              {isEuropean && (
                <Chip
                  label="EUR"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                  }}
                />
              )}
              {isForeign && (
                <Chip
                  label="ETR"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
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
                    height: 20,
                    fontSize: "0.7rem",
                  }}
                />
              )}
              {isOutOfChampionship && (
                <Chip
                  label={
                    selectedEpreuve === "championnat_paris"
                      ? "Hors championnat de Paris"
                      : "Hors championnat"
                  }
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                  }}
                />
              )}
              {!player.isActive && !player.isTemporary && (
                <Chip
                  label="Sans licence"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
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
                    height: 20,
                    fontSize: "0.7rem",
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
                      height: 20,
                      fontSize: "0.7rem",
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
                      height: 20,
                      fontSize: "0.7rem",
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              {player.points !== undefined && player.points !== null
                ? `${player.points} points`
                : "Points non disponibles"}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

