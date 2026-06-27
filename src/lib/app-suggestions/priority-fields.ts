import type { SuggestionPriority } from "@/lib/app-suggestions/types";
import { SUGGESTION_PRIORITY_RANK } from "@/lib/app-suggestions/status";

export function resolveStoredSuggestionPriority(
  priority: SuggestionPriority | undefined
): SuggestionPriority {
  return priority ?? "medium";
}

export function buildSuggestionPriorityFields(priority: SuggestionPriority): {
  priority: SuggestionPriority;
  priorityRank: number;
} {
  return {
    priority,
    priorityRank: SUGGESTION_PRIORITY_RANK[priority],
  };
}
