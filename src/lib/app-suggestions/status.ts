import type { SuggestionKind, SuggestionStatus } from "@/lib/app-suggestions/types";
import { formatSuggestionCategoryLabel } from "@/lib/app-suggestions/categories";

export { formatSuggestionCategoryLabel };

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

export const SUGGESTION_KIND_LABELS: Record<SuggestionKind, string> = {
  improvement: "Idée",
  problem: "Problème",
};

export const SUGGESTION_KIND_COLORS: Record<
  SuggestionKind,
  "default" | "info" | "warning"
> = {
  improvement: "info",
  problem: "warning",
};

export const SUGGESTION_PRIORITY_LABELS = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
} as const;

/** Retours encore en suivi (hors livrés ou classés sans suite). */
export const SUGGESTION_OPEN_STATUSES = [
  "received",
  "reviewing",
  "planned",
  "in_progress",
] as const satisfies readonly SuggestionStatus[];

export type SuggestionStatusFilter = SuggestionStatus | "all" | "open";

export const SUGGESTION_STATUS_FILTER_LABELS: Record<SuggestionStatusFilter, string> = {
  open: "Ouvertes",
  all: "Toutes",
  received: SUGGESTION_STATUS_LABELS.received,
  reviewing: SUGGESTION_STATUS_LABELS.reviewing,
  planned: SUGGESTION_STATUS_LABELS.planned,
  in_progress: SUGGESTION_STATUS_LABELS.in_progress,
  released: SUGGESTION_STATUS_LABELS.released,
  declined: SUGGESTION_STATUS_LABELS.declined,
};

/** Statuts où l'auteur peut encore modifier titre / description / catégorie. */
export const AUTHOR_EDITABLE_STATUSES: readonly SuggestionStatus[] = [
  "received",
  "reviewing",
];

export function isAuthorEditableStatus(status: SuggestionStatus): boolean {
  return AUTHOR_EDITABLE_STATUSES.includes(status);
}

export function resolveSuggestionStatusFilter(
  raw: string | null | undefined
): SuggestionStatusFilter {
  if (!raw) {
    return "open";
  }
  if (raw === "all" || raw === "open") {
    return raw;
  }
  if (raw in SUGGESTION_STATUS_LABELS) {
    return raw as SuggestionStatus;
  }
  return "open";
}

export function matchesSuggestionStatusFilter(
  status: SuggestionStatus,
  statusFilter: SuggestionStatusFilter
): boolean {
  if (statusFilter === "all") {
    return true;
  }
  if (statusFilter === "open") {
    return (SUGGESTION_OPEN_STATUSES as readonly string[]).includes(status);
  }
  return status === statusFilter;
}
