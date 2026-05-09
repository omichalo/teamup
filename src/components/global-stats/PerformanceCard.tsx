import {
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import type { GlobalStatsData } from "./types";

interface PerformanceCardProps {
  performance: GlobalStatsData["performance"];
}

export function PerformanceCard({ performance }: PerformanceCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Performance
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Durée moyenne des matchs"
              secondary={`${performance.averageMatchDuration} minutes`}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Classement moyen des joueurs"
              secondary={performance.averagePlayerRating.toFixed(1)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Classement moyen des équipes"
              secondary={performance.averageTeamRating.toFixed(1)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Taux de victoire"
              secondary={`${(performance.winRate * 100).toFixed(1)}%`}
            />
            <LinearProgress
              variant="determinate"
              value={performance.winRate * 100}
              sx={{ width: 100, ml: 2 }}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Taux de participation"
              secondary={`${(performance.participationRate * 100).toFixed(1)}%`}
            />
            <LinearProgress
              variant="determinate"
              value={performance.participationRate * 100}
              sx={{ width: 100, ml: 2 }}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
