import { ACTIONABLE_REGISTRATION_STATUSES } from "@/lib/club-registration/registration-status";
import { normalizeCity } from "./normalize-city";
import { resolveRenewalKey } from "./resolve-record-keys";
import type { AnalyticsRegistrationRecord, RegistrationAnalyticsSummary } from "./types";

export type CampaignBarometer = {
  total: number;
  approved: number;
  paid: number;
  /** Dossiers clos : payés + validés à 0 €. */
  settled: number;
  actionable: number;
  rejected: number;
  approvedPct: number;
  paidPct: number;
  settledPct: number;
  actionablePct: number;
};

export type RecruitmentCityInsight = {
  city: string;
  count: number;
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Indicateurs de campagne dérivés du bucket `summary.status` déjà agrégé. */
export function buildCampaignBarometer(summary: RegistrationAnalyticsSummary): CampaignBarometer {
  const total = summary.total;
  const approved = summary.status.approved ?? 0;
  const paid = summary.status.paid ?? 0;
  const rejected = summary.status.rejected ?? 0;
  const actionable = ACTIONABLE_REGISTRATION_STATUSES.reduce(
    (sum, status) => sum + (summary.status[status] ?? 0),
    0
  );

  const settled = paid + approved;

  return {
    total,
    approved,
    paid,
    settled,
    actionable,
    rejected,
    approvedPct: pct(approved, total),
    paidPct: pct(paid, total),
    settledPct: pct(settled, total),
    actionablePct: pct(actionable, total),
  };
}

/**
 * Top villes parmi les nouveaux adhérents (pas renouvellement).
 * Utile pour un insight « recrutement » sans nouvelle source de données.
 */
export function buildNewcomerCityInsights(
  records: AnalyticsRegistrationRecord[],
  topN = 3
): RecruitmentCityInsight[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (resolveRenewalKey(record) !== "new") continue;
    const city = normalizeCity(record.city);
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, topN)
    .map(([city, count]) => ({ city, count }));
}
