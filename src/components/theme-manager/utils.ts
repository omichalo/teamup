import type { Theme } from "./types";

type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getThemeStatus(theme: Theme, currentTheme: string): string {
  if (theme.isDefault) return "Par défaut";
  if (theme.id === currentTheme) return "Actif";
  return "Disponible";
}

export function getThemeStatusColor(theme: Theme, currentTheme: string): MuiColor {
  if (theme.isDefault) return "primary";
  if (theme.id === currentTheme) return "success";
  return "default";
}

export function formatThemeDate(dateString: string): string {
  return new Date(dateString).toLocaleString("fr-FR");
}
