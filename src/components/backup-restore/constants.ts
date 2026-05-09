import type { BackupOptions } from "./types";

export const BACKUP_DATA_TYPES = [
  { value: "players", label: "Joueurs" },
  { value: "teams", label: "Équipes" },
  { value: "matches", label: "Matchs" },
  { value: "championships", label: "Championnats" },
  { value: "availabilities", label: "Disponibilités" },
  { value: "compositions", label: "Compositions" },
  { value: "users", label: "Utilisateurs" },
  { value: "settings", label: "Paramètres" },
  { value: "audit_logs", label: "Logs d&apos;audit" },
] as const;

export const DEFAULT_BACKUP_OPTIONS: BackupOptions = {
  name: "",
  type: "full",
  description: "",
  dataTypes: ["players", "teams", "matches"],
  compression: true,
  encryption: false,
};
