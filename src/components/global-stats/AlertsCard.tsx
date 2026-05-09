import {
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type { ReactNode } from "react";
import type { GlobalStatsData } from "./types";

interface AlertsCardProps {
  alerts: GlobalStatsData["alerts"];
}

function alertIcon(type: GlobalStatsData["alerts"][number]["type"]): ReactNode {
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
}

function alertColor(type: GlobalStatsData["alerts"][number]["type"]) {
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
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Alertes et notifications
        </Typography>
        {alerts.length === 0 ? (
          <Alert severity="info">Aucune alerte en cours</Alert>
        ) : (
          <List dense>
            {alerts.map((alert, index) => (
              <ListItem key={`${alert.type}-${index}`}>
                <ListItemIcon>{alertIcon(alert.type)}</ListItemIcon>
                <ListItemText
                  primary={alert.message}
                  secondary={`${alert.count} occurrence(s)`}
                />
                <Chip label={alert.type} color={alertColor(alert.type)} size="small" />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
