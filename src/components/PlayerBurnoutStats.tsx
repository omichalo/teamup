"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Sports as SportsIcon,
} from "@mui/icons-material";
import { PlayerStats, Team } from "@/types/team-management";

interface PlayerBurnoutStatsProps {
  playerStats: PlayerStats;
  teams: Team[];
  playerName: string;
}

export function PlayerBurnoutStats({
  playerStats,
  teams,
  playerName,
}: PlayerBurnoutStatsProps) {
  const getBurnoutIcon = (canPlay: boolean, reason?: string) => {
    if (canPlay && !reason) {
      return <CheckCircleIcon color="success" />;
    } else if (canPlay && reason) {
      return <WarningIcon color="warning" />;
    } else {
      return <ErrorIcon color="error" />;
    }
  };

  const getBurnoutColor = (canPlay: boolean, reason?: string) => {
    if (canPlay && !reason) {
      return "success";
    } else if (canPlay && reason) {
      return "warning";
    } else {
      return "error";
    }
  };

  const getBurnoutStatus = (canPlay: boolean, reason?: string) => {
    if (canPlay && !reason) {
      return "Peut jouer";
    } else if (canPlay && reason) {
      return "Peut jouer (avec restriction)";
    } else {
      return "Ne peut pas jouer";
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Équipe inconnue";
  };

  const getTeamDivision = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.division : "";
  };

  const totalMatches = playerStats.totalMatches;
  const teamsWithMatches = Object.keys(playerStats.matchesByTeam).length;
  const lastPlayed = playerStats.lastPlayed;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistiques de brûlage - {playerName}
        </Typography>

        <Box mb={3}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box
              sx={{ width: { xs: "100%", sm: "33.33%" }, textAlign: "center" }}
            >
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {totalMatches}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Matchs joués
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{ width: { xs: "100%", sm: "33.33%" }, textAlign: "center" }}
            >
              <Box textAlign="center">
                <Typography variant="h4" color="secondary">
                  {teamsWithMatches}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Équipes différentes
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{ width: { xs: "100%", sm: "33.33%" }, textAlign: "center" }}
            >
              <Box textAlign="center">
                <Typography variant="h6" color="text.secondary">
                  {lastPlayed
                    ? new Date(lastPlayed).toLocaleDateString()
                    : "Jamais"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dernier match
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Statut de brûlage par équipe
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Équipe</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Matchs joués</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Détails</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(playerStats.burnoutStatus).map(
                ([teamId, status]) => {
                  const matchesCount = playerStats.matchesByTeam[teamId] || 0;
                  const teamName = getTeamName(teamId);
                  const teamDivision = getTeamDivision(teamId);

                  return (
                    <TableRow key={teamId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {teamName}
                        </Typography>
                      </TableCell>
                      <TableCell>{teamDivision}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <SportsIcon color="action" />
                          <Typography variant="body2">
                            {matchesCount}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getBurnoutIcon(status.canPlay, status.reason)}
                          <Chip
                            label={getBurnoutStatus(
                              status.canPlay,
                              status.reason
                            )}
                            color={getBurnoutColor(
                              status.canPlay,
                              status.reason
                            )}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {status.reason && (
                          <Typography variant="caption" color="text.secondary">
                            {status.reason}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalMatches === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Ce joueur n&apos;a encore joué aucun match cette saison.
          </Alert>
        )}

        {Object.values(playerStats.burnoutStatus).some(
          (status) => !status.canPlay
        ) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Ce joueur a des restrictions de brûlage sur certaines équipes.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
