import { computeAgeAt } from "@/lib/club-registration/age";
import { getClubSeasonAgeReferenceDate } from "@/lib/club-registration/season-age";

export type AgeBracketDefinition = {
  id: string;
  label: string;
  minAge: number;
  maxAge: number | null;
};

export const DEFAULT_ANALYTICS_AGE_BRACKETS: AgeBracketDefinition[] = [
  { id: "under_7", label: "Moins de 7 ans", minAge: 0, maxAge: 6 },
  { id: "7_10", label: "7–10 ans", minAge: 7, maxAge: 10 },
  { id: "11_12", label: "11–12 ans", minAge: 11, maxAge: 12 },
  { id: "13_14", label: "13–14 ans", minAge: 13, maxAge: 14 },
  { id: "15_17", label: "15–17 ans", minAge: 15, maxAge: 17 },
  { id: "18_64", label: "18–64 ans", minAge: 18, maxAge: 64 },
  { id: "65_plus", label: "65 ans et plus", minAge: 65, maxAge: null },
];

const UNKNOWN_BRACKET_ID = "unknown";

export function resolveAgeBracketId(
  birthDate: string | undefined,
  seasonLabel: string,
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): string {
  if (!birthDate?.trim()) return UNKNOWN_BRACKET_ID;
  const age = computeAgeAt(birthDate, getClubSeasonAgeReferenceDate(seasonLabel));
  if (age === null) return UNKNOWN_BRACKET_ID;

  for (const bracket of brackets) {
    if (age < bracket.minAge) continue;
    if (bracket.maxAge === null || age <= bracket.maxAge) {
      return bracket.id;
    }
  }
  return UNKNOWN_BRACKET_ID;
}

export function ageBracketLabel(
  bracketId: string,
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): string {
  if (bracketId === UNKNOWN_BRACKET_ID) return "Non renseigné";
  return brackets.find((b) => b.id === bracketId)?.label ?? bracketId;
}

export function orderedAgeBracketIds(
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): string[] {
  return [...brackets.map((b) => b.id), UNKNOWN_BRACKET_ID];
}
