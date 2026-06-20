"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  IconButton,
  Popover,
  Tooltip,
} from "@mui/material";
import { People } from "@mui/icons-material";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import { CompositionsTable } from "@/components/compositions/CompositionsTable";
import { buildCompositionHistoryForEquipe } from "@/lib/shared/team-composition-history";

export interface TeamCompositionHistoryPopoverProps {
  equipe: EquipeWithMatches;
  selectedPhase?: "aller" | "retour" | null;
  iconSize?: "small" | "medium" | "large";
  iconColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
}

export function TeamCompositionHistoryPopover({
  equipe,
  selectedPhase,
  iconSize = "medium",
  iconColor = "secondary",
}: TeamCompositionHistoryPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const matchesForTable = useMemo(
    () => buildCompositionHistoryForEquipe(equipe.matches, equipe, selectedPhase),
    [equipe, selectedPhase]
  );

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Historique des compositions">
        <span>
          <IconButton
            size={iconSize}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Historique des compositions"
            disabled={matchesForTable.length === 0}
            color={iconColor}
          >
            <People fontSize={iconSize} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            maxWidth: "95vw",
            maxHeight: "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Joueurs par journée — {equipe.team.name}
          </Typography>
          {matchesForTable.length === 0 ? (
            <Alert severity="info">Aucune composition disponible.</Alert>
          ) : (
            <CompositionsTable matches={matchesForTable} />
          )}
        </Box>
      </Popover>
    </>
  );
}
