import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import type { GlobalStatsData } from "./types";

interface DistributionCardProps {
  distribution: GlobalStatsData["distribution"];
  totalPlayers: number;
}

function percentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (value / total) * 100;
}

export function DistributionCard({
  distribution,
  totalPlayers,
}: DistributionCardProps) {
  return (
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
                Hommes: {distribution.playersByGender.male}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage(distribution.playersByGender.male, totalPlayers)}
                sx={{ flexGrow: 1, ml: 1 }}
              />
            </Box>
            <Box display="flex" alignItems="center">
              <Typography variant="body2" sx={{ mr: 1 }}>
                Femmes: {distribution.playersByGender.female}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage(distribution.playersByGender.female, totalPlayers)}
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
                Juniors: {distribution.playersByAge.junior}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage(distribution.playersByAge.junior, totalPlayers)}
                sx={{ flexGrow: 1, ml: 1 }}
              />
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Seniors: {distribution.playersByAge.senior}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage(distribution.playersByAge.senior, totalPlayers)}
                sx={{ flexGrow: 1, ml: 1 }}
              />
            </Box>
            <Box display="flex" alignItems="center">
              <Typography variant="body2" sx={{ mr: 1 }}>
                Vétérans: {distribution.playersByAge.veteran}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage(distribution.playersByAge.veteran, totalPlayers)}
                sx={{ flexGrow: 1, ml: 1 }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
