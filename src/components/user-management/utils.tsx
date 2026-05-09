import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { ROLES, STATUSES } from "./constants";

type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getRoleColor(role: string): MuiColor {
  const roleObj = ROLES.find((item) => item.value === role);
  return (roleObj?.color as MuiColor | undefined) ?? "default";
}

export function getStatusColor(status: string): MuiColor {
  const statusObj = STATUSES.find((item) => item.value === status);
  return (statusObj?.color as MuiColor | undefined) ?? "default";
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircleIcon color="success" />;
    case "inactive":
      return <InfoIcon color="inherit" />;
    case "suspended":
      return <ErrorIcon color="error" />;
    case "pending":
      return <WarningIcon color="warning" />;
    default:
      return <InfoIcon color="inherit" />;
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR");
}

export function isUserLocked(lockedUntil?: string): boolean {
  if (!lockedUntil) {
    return false;
  }
  return new Date(lockedUntil) > new Date();
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
