import type { SuggestionCategory, SuggestionKind } from "@/lib/app-suggestions/types";
import { SUGGESTION_KINDS } from "@/lib/app-suggestions/types";
import {
  isValidSuggestionCategory,
  normalizeSuggestionCategory,
} from "@/lib/app-suggestions/categories";

export function resolveSuggestionMineFilter(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

export function resolveSuggestionKindFilter(
  raw: string | null
): SuggestionKind | "all" {
  if (!raw || raw === "all") {
    return "all";
  }
  if ((SUGGESTION_KINDS as readonly string[]).includes(raw)) {
    return raw as SuggestionKind;
  }
  return "all";
}

export function resolveSuggestionCategoryFilter(
  raw: string | null
): SuggestionCategory | "all" {
  if (!raw || raw === "all") {
    return "all";
  }
  const normalized = normalizeSuggestionCategory(raw);
  if (isValidSuggestionCategory(normalized)) {
    return normalized;
  }
  return "all";
}
