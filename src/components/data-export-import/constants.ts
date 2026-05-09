import type { ExportOptions, ImportOptions } from "./types";

export const DATA_TYPES = [
  { value: "players", label: "Joueurs" },
  { value: "teams", label: "Équipes" },
  { value: "matches", label: "Matchs" },
  { value: "championships", label: "Championnats" },
  { value: "availabilities", label: "Disponibilités" },
  { value: "compositions", label: "Compositions" },
  { value: "settings", label: "Paramètres" },
  { value: "users", label: "Utilisateurs" },
  { value: "audit_logs", label: "Logs d&apos;audit" },
] as const;

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "csv",
  dataTypes: ["players", "teams", "matches"],
  dateRange: {
    start: "",
    end: "",
  },
  includeMetadata: true,
  includeHistory: false,
  compression: false,
};

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  format: "csv",
  dataTypes: ["players"],
  updateExisting: false,
  validateData: true,
  createBackup: true,
};
