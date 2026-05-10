"use client";

import React from "react";
import {
  Box,
  Chip,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Accessible as AccessibleIcon,
  AlternateEmail,
  DragIndicator,
  Warning,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";

interface AvailablePlayerListItemProps {
  player: Player;
  burnedTeam: number | null | undefined;
  draggedPlayerId: string | null;
  discordStatus: "none" | "invalid" | "valid";
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
  showEligibilityChips?: boolean;
}

export function AvailablePlayerListItem({
  player,
  burnedTeam,
  draggedPlayerId,
  discordStatus,
  onDragStart,
  onDragEnd,
  showEligibilityChips = false,
}: AvailablePlayerListItemProps) {
  const isForeign = player.nationality === "ETR";
  const isEuropean = player.nationality === "C";

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
            "&:hover": { cursor: "grab" },
            "&:active": { cursor: "grabbing" },
          }}
          disabled
        >
          <DragIndicator fontSize="small" />
        </IconButton>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body2" component="span">
                {player.firstName} {player.name}
              </Typography>
              {player.isWheelchair && (
                <Tooltip title="Joueur en fauteuil">
                  <AccessibleIcon fontSize="small" sx={{ color: "primary.main", ml: 0.5 }} />
                </Tooltip>
              )}
              {isEuropean && (
                <Chip label="EUR" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
              {isForeign && (
                <Chip label="ETR" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
              {burnedTeam !== undefined && burnedTeam !== null && (
                <Chip
                  label={`Brûlé Éq. ${burnedTeam}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
              {player.isTemporary && (
                <Chip
                  label="Temporaire"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
              {showEligibilityChips && !player.participation?.championnat && (
                <Chip
                  label="Hors championnat"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
              {showEligibilityChips && !player.isActive && !player.isTemporary && (
                <Chip
                  label="Sans licence"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
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
                    sx={{ height: 20, fontSize: "0.7rem" }}
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
                    sx={{ height: 20, fontSize: "0.7rem" }}
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
