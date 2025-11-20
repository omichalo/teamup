"use client";

import React from "react";
import { Paper, Typography, Chip, Box } from "@mui/material";

export interface CompositionsSummaryProps {
  totalTeams: number;
  completedTeams: number;
  incompleteTeams: number;
  invalidTeams?: number;
  matchesPlayed?: number;
  completionLabel?: string;
  showMatchesPlayed?: boolean;
  percentage?: number;
  sx?: Record<string, unknown>;
  title?: string;
  discordMessagesSent?: number;
  discordMessagesTotal?: number;
}

export const CompositionsSummary: React.FC<CompositionsSummaryProps> = ({
  totalTeams,
  completedTeams,
  incompleteTeams,
  invalidTeams = 0,
  matchesPlayed = 0,
  completionLabel,
  showMatchesPlayed = true,
  percentage,
  sx,
  title = "Bilan des compositions",
  discordMessagesSent = 0,
  discordMessagesTotal = 0,
}) => {
  const totalEditable = totalTeams;
  const computedPercentage =
    percentage ??
    (totalEditable > 0 ? Math.round((completedTeams / totalEditable) * 100) : 0);

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: "background.default",
        ...sx,
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Chip
          label={`${totalEditable} équipe${totalEditable > 1 ? "s" : ""} à composer`}
          color="default"
          variant="outlined"
        />
        <Chip
          label={`${completedTeams} complète${completedTeams > 1 ? "s" : ""}`}
          color="success"
          variant={completedTeams > 0 ? "filled" : "outlined"}
        />
        <Chip
          label={`${incompleteTeams} incomplète${incompleteTeams > 1 ? "s" : ""}`}
          color="warning"
          variant={incompleteTeams > 0 ? "filled" : "outlined"}
        />
        <Chip
          label={`${invalidTeams} invalide${invalidTeams > 1 ? "s" : ""}`}
          color="error"
          variant={invalidTeams > 0 ? "filled" : "outlined"}
        />
        {showMatchesPlayed && matchesPlayed > 0 && (
          <Chip
            label={`${matchesPlayed} match${matchesPlayed > 1 ? "s" : ""} joué${
              matchesPlayed > 1 ? "s" : ""
            }`}
            color="info"
            variant="outlined"
          />
        )}
        {discordMessagesTotal > 0 && (
          <Chip
            label={`${discordMessagesSent}/${discordMessagesTotal} message${discordMessagesTotal > 1 ? "s" : ""} Discord envoyé${discordMessagesTotal > 1 ? "s" : ""}`}
            color={discordMessagesSent === discordMessagesTotal ? "success" : "primary"}
            variant={discordMessagesSent === discordMessagesTotal ? "filled" : "outlined"}
          />
        )}
        {totalEditable > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
            {computedPercentage}% {completionLabel ?? "complété"}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};



