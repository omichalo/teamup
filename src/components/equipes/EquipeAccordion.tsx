"use client";

import React from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { SportsTennis, Message, LocationOn } from "@mui/icons-material";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { Match } from "@/types";
import { USER_ROLES } from "@/lib/auth/roles";
import { getTeamPhase } from "@/lib/shared/fftt-utils";
import { isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { PoolRankingPopover } from "@/components/compositions/PoolRankingPopover";
import { TeamCompositionHistoryPopover } from "@/components/teams/TeamCompositionHistoryPopover";
import { TeamMatchesCalendarPopover } from "@/components/teams/TeamMatchesCalendarPopover";

export type MatchContextForPopover = {
  teamId: string;
  phase: "aller" | "retour" | null;
};

export interface EquipeAccordionProps {
  equipeWithMatches: EquipeWithMatches;
  epreuve: string;
  locations: Array<{ id: string; name: string }>;
  discordChannels: Array<{ id: string; name: string }>;
  user: { role?: string } | null;
  onOpenLocationDialog: (teamId: string) => void;
  onOpenDiscordChannelDialog: (teamId: string) => void;
  onMatchClick?: (match: Match, context?: MatchContextForPopover) => void;
}

function teamPhaseToApiPhase(
  phaseKind: "phase1" | "phase2" | "sansPhase"
): "aller" | "retour" | null {
  if (phaseKind === "phase1") return "aller";
  if (phaseKind === "phase2") return "retour";
  return null;
}

export function EquipeAccordion({
  equipeWithMatches,
  epreuve,
  locations,
  discordChannels,
  user,
  onOpenLocationDialog,
  onOpenDiscordChannelDialog,
}: EquipeAccordionProps) {
  const phaseKind = getTeamPhase(equipeWithMatches);
  const poolPhase = teamPhaseToApiPhase(phaseKind);

  const borderColor = isParisEpreuve(epreuve)
    ? "#9c27b0"
    : epreuve.includes("Féminin")
      ? "#f57c00"
      : "#1976d2";

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <SportsTennis sx={{ color: borderColor }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6">{equipeWithMatches.team.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {equipeWithMatches.team.division}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              Lieu:{" "}
              {equipeWithMatches.team.location
                ? locations.find((l) => l.id === equipeWithMatches.team.location)?.name ||
                  equipeWithMatches.team.location
                : "Non défini"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Discord:{" "}
              {equipeWithMatches.team.discordChannelId
                ? discordChannels.find((c) => c.id === equipeWithMatches.team.discordChannelId)
                    ?.name || "Canal configuré"
                : "Non configuré"}
            </Typography>
            {(!equipeWithMatches.team.location || !equipeWithMatches.team.discordChannelId) && (
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                {!equipeWithMatches.team.location && (
                  <Chip label="Sans lieu" size="small" color="warning" variant="outlined" />
                )}
                {!equipeWithMatches.team.discordChannelId && (
                  <Chip label="Sans Discord" size="small" color="info" variant="outlined" />
                )}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.COACH) && (
            <>
              <Tooltip title="Modifier le lieu">
                <IconButton
                  size="medium"
                  onClick={() => onOpenLocationDialog(equipeWithMatches.team.id)}
                  aria-label="Modifier le lieu"
                  color="primary"
                >
                  <LocationOn fontSize="medium" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Modifier le canal Discord">
                <IconButton
                  size="medium"
                  onClick={() => onOpenDiscordChannelDialog(equipeWithMatches.team.id)}
                  aria-label="Modifier le canal Discord"
                  color="info"
                >
                  <Message fontSize="medium" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <TeamMatchesCalendarPopover equipe={equipeWithMatches} />
          <TeamCompositionHistoryPopover equipe={equipeWithMatches} />
          <PoolRankingPopover
            teamId={equipeWithMatches.team.id}
            teamName={equipeWithMatches.team.name}
            phase={poolPhase}
            iconSize="medium"
            iconColor="warning"
          />
        </Box>
      </Box>
    </Box>
  );
}
