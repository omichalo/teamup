import type { AnalyticsRegistrationRecord } from "./types";

/** Clés d’agrégation handisport (loisirs / compétition / section sans niveau / non). */
export type HandisportAnalyticsKey = "leisure" | "competition" | "yes" | "no";

export function resolveRenewalKey(record: AnalyticsRegistrationRecord): string {
  if (record.wasSqyMemberLastYear === true) return "renewal";
  if (record.wasSqyMemberLastYear === false) return "new";
  return "unknown";
}

export function resolveHandisportKey(record: AnalyticsRegistrationRecord): HandisportAnalyticsKey {
  const level = record.handisportPracticeLevel;
  if (level === "leisure") return "leisure";
  if (level === "competition") return "competition";
  if (
    record.mainSectionId === "handisport" ||
    record.mainSectionId === "sport-adapte" ||
    Boolean(level)
  ) {
    return "yes";
  }
  return "no";
}

export function resolveCompetitorKey(record: AnalyticsRegistrationRecord): string {
  return record.wantsCompetitorExtras === true ? "yes" : "no";
}

export function resolveMinorKey(record: AnalyticsRegistrationRecord): string {
  if (record.isMinor === true) return "minor";
  if (record.isMinor === false) return "adult";
  return "unknown";
}

export function resolveSexKey(record: AnalyticsRegistrationRecord): string {
  return record.sex ?? "unknown";
}
