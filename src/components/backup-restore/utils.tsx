import {
  Backup as BackupIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";

type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getBackupTypeIcon(type: string) {
  switch (type) {
    case "full":
      return <BackupIcon color="primary" />;
    case "incremental":
      return <BackupIcon color="secondary" />;
    case "differential":
      return <BackupIcon color="info" />;
    default:
      return <BackupIcon color="inherit" />;
  }
}

export function getBackupTypeColor(type: string): MuiColor {
  switch (type) {
    case "full":
      return "primary";
    case "incremental":
      return "secondary";
    case "differential":
      return "info";
    default:
      return "default";
  }
}

export function getBackupStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircleIcon color="success" />;
    case "failed":
      return <ErrorIcon color="error" />;
    case "in_progress":
      return <CircularProgress size={20} />;
    case "scheduled":
      return <ScheduleIcon color="info" />;
    default:
      return <InfoIcon color="inherit" />;
  }
}

export function getBackupStatusColor(status: string): MuiColor {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "in_progress":
      return "info";
    case "scheduled":
      return "info";
    default:
      return "default";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, sizeIndex);
  return `${value.toFixed(2)} ${sizes[sizeIndex]}`;
}

export function formatBackupDate(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR");
}
