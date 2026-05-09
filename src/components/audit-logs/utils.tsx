import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { AUDIT_CATEGORIES } from "./constants";

type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getLevelIcon(level: string) {
  switch (level) {
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

export function getLevelColor(level: string): MuiColor {
  switch (level) {
    case "info":
      return "info";
    case "warning":
      return "warning";
    case "error":
      return "error";
    case "success":
      return "success";
    default:
      return "default";
  }
}

export function getCategoryIcon(category: string) {
  const categoryItem = AUDIT_CATEGORIES.find((item) => item.value === category);
  return categoryItem ? categoryItem.icon : <InfoIcon />;
}

export function getCategoryLabel(category: string): string {
  const categoryItem = AUDIT_CATEGORIES.find((item) => item.value === category);
  return categoryItem ? categoryItem.label : category;
}

export function getSeverityColor(severity: string): MuiColor {
  switch (severity) {
    case "critical":
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

export function formatAuditDate(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR");
}
