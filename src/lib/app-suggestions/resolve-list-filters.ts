import type { SuggestionCategory } from "@/lib/app-suggestions/types";
import { SUGGESTION_CATEGORIES } from "@/lib/app-suggestions/types";

export function resolveSuggestionMineFilter(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

export function resolveSuggestionCategoryFilter(
  raw: string | null
): SuggestionCategory | "all" {
  if (!raw || raw === "all") {
    return "all";
  }
  if ((SUGGESTION_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as SuggestionCategory;
  }
  return "all";
}
