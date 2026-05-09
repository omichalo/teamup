import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Sports as SportsIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import type { ReactNode } from "react";
import type { GlobalStatsData } from "./types";

interface OverviewCardsProps {
  stats: GlobalStatsData;
}

function ratioPercentage(value: number, total: number): string {
  if (total <= 0) {
    return "0.0";
  }
  return ((value / total) * 100).toFixed(1);
}

function TrendIndicator({ trend }: { trend: number }): ReactNode {
  if (trend > 0) {
    return <TrendingUpIcon color="success" />;
  }
  if (trend < 0) {
    return <TrendingDownIcon color="error" />;
  }
  return <TrendingUpIcon color="disabled" />;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <>
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
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Actifs: {stats.overview.activePlayers}
              </Typography>
              <Chip
                label={`${ratioPercentage(
                  stats.overview.activePlayers,
                  stats.overview.totalPlayers
                )}%`}
                color="success"
                size="small"
              />
            </Box>
            <Box display="flex" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Inactifs: {stats.overview.inactivePlayers}
              </Typography>
              <Chip
                label={`${ratioPercentage(
                  stats.overview.inactivePlayers,
                  stats.overview.totalPlayers
                )}%`}
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
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Croissance: {stats.trends.teamGrowth > 0 ? "+" : ""}
                {stats.trends.teamGrowth}%
              </Typography>
              <TrendIndicator trend={stats.trends.teamGrowth} />
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
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                À venir: {stats.overview.upcomingMatches}
              </Typography>
              <Chip
                label={`${ratioPercentage(
                  stats.overview.upcomingMatches,
                  stats.overview.totalMatches
                )}%`}
                color="info"
                size="small"
              />
            </Box>
            <Box display="flex" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Terminés: {stats.overview.completedMatches}
              </Typography>
              <Chip
                label={`${ratioPercentage(
                  stats.overview.completedMatches,
                  stats.overview.totalMatches
                )}%`}
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
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Croissance: {stats.trends.championshipGrowth > 0 ? "+" : ""}
                {stats.trends.championshipGrowth}%
              </Typography>
              <TrendIndicator trend={stats.trends.championshipGrowth} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
