"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Sports as SportsIcon,
  Event as EventIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface GlobalStatsProps {
  stats: {
    overview: {
      totalPlayers: number;
      totalTeams: number;
      totalMatches: number;
      totalChampionships: number;
      activePlayers: number;
      inactivePlayers: number;
      upcomingMatches: number;
      completedMatches: number;
    };
    trends: {
      playerGrowth: number;
      teamGrowth: number;
      matchGrowth: number;
      championshipGrowth: number;
    };
    performance: {
      averageMatchDuration: number;
      averagePlayerRating: number;
      averageTeamRating: number;
      winRate: number;
      participationRate: number;
    };
    distribution: {
      playersByGender: { male: number; female: number };
      playersByAge: { junior: number; senior: number; veteran: number };
      teamsByDivision: { [key: string]: number };
      matchesByMonth: { [key: string]: number };
    };
    alerts: {
      type: "warning" | "error" | "info" | "success";
      message: string;
      count: number;
    }[];
  };
  onRefresh: () => Promise<void>;
  onExport: (format: "csv" | "pdf" | "excel") => Promise<void>;
  loading?: boolean;
}

export function GlobalStats({
  stats,
  onRefresh,
  onExport,
  loading = false,
}: GlobalStatsProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    try {
      setExporting(format);
      await onExport(format);
    } catch (error) {
      console.error("Erreur lors de l&apos;export:", error);
    } finally {
      setExporting(null);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUpIcon color="success" />;
    if (trend < 0) return <TrendingDownIcon color="error" />;
    return <TrendingUpIcon color="disabled" />;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <WarningIcon color="warning" />;
      case "error":
        return <WarningIcon color="error" />;
      case "info":
        return <InfoIcon color="info" />;
      case "success":
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "warning":
        return "warning";
      case "error":
        return "error";
      case "info":
        return "info";
      case "success":
        return "success";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Statistiques globales</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("csv")}
            disabled={exporting === "csv"}
          >
            {exporting === "csv" ? "Export..." : "CSV"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("pdf")}
            disabled={exporting === "pdf"}
          >
            {exporting === "pdf" ? "Export..." : "PDF"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("excel")}
            disabled={exporting === "excel"}
          >
            {exporting === "excel" ? "Export..." : "Excel"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <Box sx={{ width: { xs: "100%", md: "25%" } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Joueurs</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.overview.totalPlayers}
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Actifs: {stats.overview.activePlayers}
                </Typography>
                <Chip
                  label={`${(
                    (stats.overview.activePlayers /
                      stats.overview.totalPlayers) *
                    100
                  ).toFixed(1)}%`}
                  color="success"
                  size="small"
                />
              </Box>
              <Box display="flex" alignItems="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Inactifs: {stats.overview.inactivePlayers}
                </Typography>
                <Chip
                  label={`${(
                    (stats.overview.inactivePlayers /
                      stats.overview.totalPlayers) *
                    100
                  ).toFixed(1)}%`}
                  color="default"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "25%" } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SportsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Équipes</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.overview.totalTeams}
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Croissance: {stats.trends.teamGrowth > 0 ? "+" : ""}
                  {stats.trends.teamGrowth}%
                </Typography>
                {getTrendIcon(stats.trends.teamGrowth)}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "25%" } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Matchs</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.overview.totalMatches}
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  À venir: {stats.overview.upcomingMatches}
                </Typography>
                <Chip
                  label={`${(
                    (stats.overview.upcomingMatches /
                      stats.overview.totalMatches) *
                    100
                  ).toFixed(1)}%`}
                  color="info"
                  size="small"
                />
              </Box>
              <Box display="flex" alignItems="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Terminés: {stats.overview.completedMatches}
                </Typography>
                <Chip
                  label={`${(
                    (stats.overview.completedMatches /
                      stats.overview.totalMatches) *
                    100
                  ).toFixed(1)}%`}
                  color="success"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "25%" } }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Championnats</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.overview.totalChampionships}
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Croissance: {stats.trends.championshipGrowth > 0 ? "+" : ""}
                  {stats.trends.championshipGrowth}%
                </Typography>
                {getTrendIcon(stats.trends.championshipGrowth)}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Durée moyenne des matchs"
                    secondary={`${stats.performance.averageMatchDuration} minutes`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Classement moyen des joueurs"
                    secondary={stats.performance.averagePlayerRating.toFixed(1)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Classement moyen des équipes"
                    secondary={stats.performance.averageTeamRating.toFixed(1)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taux de victoire"
                    secondary={`${(stats.performance.winRate * 100).toFixed(
                      1
                    )}%`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={stats.performance.winRate * 100}
                    sx={{ width: 100, ml: 2 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Taux de participation"
                    secondary={`${(
                      stats.performance.participationRate * 100
                    ).toFixed(1)}%`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={stats.performance.participationRate * 100}
                    sx={{ width: 100, ml: 2 }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribution
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Par genre
                  </Typography>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Hommes: {stats.distribution.playersByGender.male}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.distribution.playersByGender.male /
                          stats.overview.totalPlayers) *
                        100
                      }
                      sx={{ flexGrow: 1, ml: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Femmes: {stats.distribution.playersByGender.female}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.distribution.playersByGender.female /
                          stats.overview.totalPlayers) *
                        100
                      }
                      sx={{ flexGrow: 1, ml: 1 }}
                    />
                  </Box>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Par âge
                  </Typography>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Juniors: {stats.distribution.playersByAge.junior}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.distribution.playersByAge.junior /
                          stats.overview.totalPlayers) *
                        100
                      }
                      sx={{ flexGrow: 1, ml: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Seniors: {stats.distribution.playersByAge.senior}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.distribution.playersByAge.senior /
                          stats.overview.totalPlayers) *
                        100
                      }
                      sx={{ flexGrow: 1, ml: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Vétérans: {stats.distribution.playersByAge.veteran}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.distribution.playersByAge.veteran /
                          stats.overview.totalPlayers) *
                        100
                      }
                      sx={{ flexGrow: 1, ml: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Équipes par division
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Division</TableCell>
                      <TableCell align="right">Nombre</TableCell>
                      <TableCell align="right">Pourcentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.distribution.teamsByDivision).map(
                      ([division, count]) => (
                        <TableRow key={division}>
                          <TableCell>{division}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                          <TableCell align="right">
                            {(
                              (count / stats.overview.totalTeams) *
                              100
                            ).toFixed(1)}
                            %
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "50%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Matchs par mois
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mois</TableCell>
                      <TableCell align="right">Nombre</TableCell>
                      <TableCell align="right">Pourcentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.distribution.matchesByMonth).map(
                      ([month, count]) => (
                        <TableRow key={month}>
                          <TableCell>{month}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                          <TableCell align="right">
                            {(
                              (count / stats.overview.totalMatches) *
                              100
                            ).toFixed(1)}
                            %
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alertes et notifications
              </Typography>
              {stats.alerts.length === 0 ? (
                <Alert severity="info">Aucune alerte en cours</Alert>
              ) : (
                <List dense>
                  {stats.alerts.map((alert, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>{getAlertIcon(alert.type)}</ListItemIcon>
                      <ListItemText
                        primary={alert.message}
                        secondary={`${alert.count} occurrence(s)`}
                      />
                      <Chip
                        label={alert.type}
                        color={getAlertColor(alert.type)}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
