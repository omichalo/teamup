"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
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
  Person as PersonIcon,
  Sports as SportsIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";

interface AvailabilityStatsProps {
  stats: {
    totalDays: number;
    averageAvailability: number;
    playersStats: {
      [playerId: string]: {
        masculine: { available: number; total: number };
        feminine: { available: number; total: number };
      };
    };
  };
  players: Array<{
    id: string;
    firstName: string;
    name: string;
    gender: "M" | "F";
  }>;
}

export function AvailabilityStats({ stats, players }: AvailabilityStatsProps) {
  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? `${player.firstName} ${player.name}` : "Joueur inconnu";
  };

  const getPlayerGender = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? player.gender : "M";
  };

  const getAvailabilityPercentage = (available: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((available / total) * 100);
  };

  const getAvailabilityColor = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "error";
  };

  const getAvailabilityLabel = (percentage: number) => {
    if (percentage >= 80) return "Excellente";
    if (percentage >= 60) return "Bonne";
    if (percentage >= 40) return "Moyenne";
    return "Faible";
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistiques de disponibilité
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 3,
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <CalendarIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="primary">
              {stats.totalDays}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Jours analysés
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <PersonIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="secondary">
              {Math.round(stats.averageAvailability)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Disponibilité moyenne
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <SportsIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {Object.keys(stats.playersStats).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Joueurs suivis
            </Typography>
          </Box>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Détail par joueur
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Joueur</TableCell>
                <TableCell align="center">Genre</TableCell>
                <TableCell align="center">Masculin</TableCell>
                <TableCell align="center">Féminin</TableCell>
                <TableCell align="center">Disponibilité globale</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(stats.playersStats).map(
                ([playerId, playerStats]) => {
                  const masculinePercentage = getAvailabilityPercentage(
                    playerStats.masculine.available,
                    playerStats.masculine.total
                  );
                  const femininePercentage = getAvailabilityPercentage(
                    playerStats.feminine.available,
                    playerStats.feminine.total
                  );
                  const totalAvailable =
                    playerStats.masculine.available +
                    playerStats.feminine.available;
                  const totalDays =
                    playerStats.masculine.total + playerStats.feminine.total;
                  const globalPercentage = getAvailabilityPercentage(
                    totalAvailable,
                    totalDays
                  );
                  const playerGender = getPlayerGender(playerId);

                  return (
                    <TableRow key={playerId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {getPlayerName(playerId)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={playerGender === "M" ? "M" : "F"}
                          color={playerGender === "M" ? "primary" : "secondary"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {playerStats.masculine.available}/
                            {playerStats.masculine.total}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={masculinePercentage}
                            color={getAvailabilityColor(masculinePercentage)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {masculinePercentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {playerStats.feminine.available}/
                            {playerStats.feminine.total}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={femininePercentage}
                            color={getAvailabilityColor(femininePercentage)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {femininePercentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Chip
                            label={getAvailabilityLabel(globalPercentage)}
                            color={getAvailabilityColor(globalPercentage)}
                            size="small"
                          />
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {globalPercentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {Object.keys(stats.playersStats).length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Aucune donnée de disponibilité disponible pour la période
            sélectionnée.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
