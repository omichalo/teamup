import type { SuggestionCategory, SuggestionStatus } from "@/lib/app-suggestions/types";

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  received: "Reçue",
  reviewing: "En étude",
  planned: "Planifiée",
  in_progress: "En cours",
  released: "Disponible",
  declined: "Pas pour l'instant",
};

export const SUGGESTION_STATUS_COLORS: Record<
  SuggestionStatus,
  "default" | "info" | "warning" | "success" | "error"
> = {
  received: "default",
  reviewing: "info",
  planned: "warning",
  in_progress: "warning",
  released: "success",
  declined: "error",
};

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  adhesions: "Adhésions",
  presences: "Présences",
  emails: "Emails",
  compositions: "Compositions",
  joueurs: "Joueurs",
  autre: "Autre",
};

export const SUGGESTION_PRIORITY_LABELS = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
} as const;

/** Statuts où l'auteur peut encore modifier titre / description / catégorie. */
export const AUTHOR_EDITABLE_STATUSES: readonly SuggestionStatus[] = [
  "received",
  "reviewing",
];

export function isAuthorEditableStatus(status: SuggestionStatus): boolean {
  return AUTHOR_EDITABLE_STATUSES.includes(status);
}

export function resolveSuggestionStatusFilter(
  raw: string | null
): SuggestionStatus | "all" {
  if (!raw || raw === "all") {
    return "all";
  }
  if (raw in SUGGESTION_STATUS_LABELS) {
    return raw as SuggestionStatus;
  }
  return "all";
}
