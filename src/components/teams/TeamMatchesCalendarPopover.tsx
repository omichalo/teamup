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
import { Event } from "@mui/icons-material";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import { MatchCardCompact } from "@/components/equipes/MatchCardCompact";
import { filterMatchesForEquipePhase } from "@/lib/shared/team-composition-history";

export interface TeamMatchesCalendarPopoverProps {
  equipe: EquipeWithMatches;
  selectedPhase?: "aller" | "retour" | null;
  iconSize?: "small" | "medium" | "large";
  iconColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
}

export function TeamMatchesCalendarPopover({
  equipe,
  selectedPhase,
  iconSize = "medium",
  iconColor = "success",
}: TeamMatchesCalendarPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const displayMatches = useMemo(
    () => filterMatchesForEquipePhase(equipe.matches, equipe, selectedPhase),
    [equipe, selectedPhase]
  );

  const sortedMatches = useMemo(
    () =>
      [...displayMatches].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [displayMatches]
  );

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Voir les matchs">
        <span>
          <IconButton
            size={iconSize}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Voir les matchs"
            disabled={displayMatches.length === 0}
            color={iconColor}
          >
            <Event fontSize={iconSize} />
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
            width: 720,
            maxHeight: "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Matchs — {equipe.team.name}
          </Typography>
          {displayMatches.length === 0 ? (
            <Alert severity="info">Aucun match trouvé pour cette équipe.</Alert>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 1.5,
              }}
            >
              {sortedMatches.map((match, index) => (
                <MatchCardCompact key={`${match.ffttId}_${index}`} match={match} />
              ))}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
