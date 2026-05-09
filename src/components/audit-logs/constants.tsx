import {
  Event as EventIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Sports as SportsIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

export const AUDIT_LEVELS = [
  { value: "info", label: "Information", color: "info" },
  { value: "warning", label: "Avertissement", color: "warning" },
  { value: "error", label: "Erreur", color: "error" },
  { value: "success", label: "Succès", color: "success" },
] as const;

export const AUDIT_CATEGORIES = [
  { value: "user", label: "Utilisateur", icon: <PersonIcon /> },
  { value: "team", label: "Équipe", icon: <SportsIcon /> },
  { value: "match", label: "Match", icon: <EventIcon /> },
  { value: "player", label: "Joueur", icon: <PersonIcon /> },
  { value: "system", label: "Système", icon: <SettingsIcon /> },
  { value: "security", label: "Sécurité", icon: <WarningIcon /> },
  { value: "data", label: "Données", icon: <InfoIcon /> },
] as const;

export const AUDIT_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "backup",
  "restore",
  "sync",
  "validate",
  "approve",
  "reject",
  "assign",
  "unassign",
] as const;
