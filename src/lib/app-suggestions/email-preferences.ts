export const SUGGESTION_EMAIL_PREFERENCES = [
  "all",
  "problems_only",
  "off",
] as const;

export type SuggestionEmailPreference =
  (typeof SUGGESTION_EMAIL_PREFERENCES)[number];

export const SUGGESTION_EMAIL_PREFERENCE_LABELS: Record<
  SuggestionEmailPreference,
  string
> = {
  all: "Tous les e-mails de la boîte à idées",
  problems_only: "Uniquement les signalements de problèmes",
  off: "Aucun e-mail de la boîte à idées",
};

export function resolveSuggestionEmailPreference(
  value: unknown
): SuggestionEmailPreference {
  if (
    value === "all" ||
    value === "problems_only" ||
    value === "off"
  ) {
    return value;
  }
  return "all";
}

export function allowsSuggestionEmail(
  preference: SuggestionEmailPreference,
  kind: "problem" | "improvement" | "status" | "comment"
): boolean {
  if (preference === "off") {
    return false;
  }
  if (preference === "problems_only") {
    return kind === "problem";
  }
  return true;
}
