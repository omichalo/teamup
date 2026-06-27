import type { SuggestionCategory } from "@/lib/app-suggestions/types";
import { SUGGESTION_DEFAULT_CATEGORIES } from "@/lib/app-suggestions/types";

export const SUGGESTION_CATEGORY_MAX_LENGTH = 40;

export const SUGGESTION_DEFAULT_CATEGORY_LABELS: Record<
  (typeof SUGGESTION_DEFAULT_CATEGORIES)[number],
  string
> = {
  adhesions: "Adhésions",
  presences: "Présences",
  emails: "Emails",
  compositions: "Compositions",
  joueurs: "Joueurs",
};

export type SuggestionCategoryOption = {
  value: string;
  label: string;
};

export function normalizeSuggestionCategory(value: string): SuggestionCategory {
  return value.trim().replace(/\s+/g, " ").slice(0, SUGGESTION_CATEGORY_MAX_LENGTH);
}

export function isValidSuggestionCategory(value: string): boolean {
  const normalized = normalizeSuggestionCategory(value);
  return normalized.length >= 2;
}

export function formatSuggestionCategoryLabel(category: string): string {
  if (category in SUGGESTION_DEFAULT_CATEGORY_LABELS) {
    return SUGGESTION_DEFAULT_CATEGORY_LABELS[
      category as keyof typeof SUGGESTION_DEFAULT_CATEGORY_LABELS
    ];
  }
  return category;
}

export function listDefaultSuggestionCategoryOptions(): SuggestionCategoryOption[] {
  return SUGGESTION_DEFAULT_CATEGORIES.map((value) => ({
    value,
    label: SUGGESTION_DEFAULT_CATEGORY_LABELS[value],
  }));
}

export function mergeSuggestionCategoryOptions(
  customCategories: readonly string[]
): SuggestionCategoryOption[] {
  const options = new Map<string, SuggestionCategoryOption>();

  for (const option of listDefaultSuggestionCategoryOptions()) {
    options.set(option.value, option);
  }

  for (const rawCategory of customCategories) {
    const value = normalizeSuggestionCategory(rawCategory);
    if (!isValidSuggestionCategory(value) || options.has(value)) {
      continue;
    }
    options.set(value, {
      value,
      label: formatSuggestionCategoryLabel(value),
    });
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "fr")
  );
}
