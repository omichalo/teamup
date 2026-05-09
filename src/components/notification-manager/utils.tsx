import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Event as EventIcon,
  Group as GroupIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Sports as SportsIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getNotificationTypeIcon(type: string) {
  switch (type) {
    case "info":
      return <InfoIcon color="info" />;
    case "warning":
      return <WarningIcon color="warning" />;
    case "error":
      return <ErrorIcon color="error" />;
    case "success":
      return <CheckCircleIcon color="success" />;
    default:
      return <InfoIcon color="inherit" />;
  }
}

export function getPriorityColor(priority: string): MuiColor {
  switch (priority) {
    case "urgent":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "default";
    default:
      return "default";
  }
}

export function getStatusColor(status: string): MuiColor {
  switch (status) {
    case "sent":
      return "success";
    case "failed":
      return "error";
    case "scheduled":
      return "info";
    case "draft":
      return "default";
    default:
      return "default";
  }
}

export function getRecipientsIcon(type: string) {
  switch (type) {
    case "all":
      return <GroupIcon />;
    case "players":
      return <PersonIcon />;
    case "teams":
      return <SportsIcon />;
    case "specific":
      return <EventIcon />;
    default:
      return <GroupIcon />;
  }
}

export function formatNotificationDate(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR");
}
