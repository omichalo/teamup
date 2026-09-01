import type { AgeBracketDefinition } from "./age-brackets";
import {
  ageBracketLabel,
  DEFAULT_ANALYTICS_AGE_BRACKETS,
  orderedAgeBracketIds,
  resolveAgeBracketId,
} from "./age-brackets";
import { normalizeCity, normalizePostalCode } from "./normalize-city";
import type {
  AnalyticsFilters,
  AnalyticsRegistrationRecord,
  CountBucket,
  RegistrationAnalyticsSummary,
  TopCountBucket,
} from "./types";

const SEX_LABELS: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  other: "Autre",
  unknown: "Non renseigné",
};

const RENEWAL_LABELS: Record<string, string> = {
  renewal: "Renouvellement",
  new: "Nouveau",
  unknown: "Non renseigné",
};

const YES_NO_LABELS: Record<string, string> = {
  yes: "Oui",
  no: "Non",
};

const MINOR_LABELS: Record<string, string> = {
  minor: "Mineur",
  adult: "Majeur",
  unknown: "Non renseigné",
};

const TOP_N = 10;

function increment(bucket: CountBucket, key: string): void {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

function resolveSexKey(record: AnalyticsRegistrationRecord): string {
  return record.sex ?? "unknown";
}

function resolveRenewalKey(record: AnalyticsRegistrationRecord): string {
  if (record.wasSqyMemberLastYear === true) return "renewal";
  if (record.wasSqyMemberLastYear === false) return "new";
  return "unknown";
}

function resolveHandisportKey(record: AnalyticsRegistrationRecord): string {
  if (
    record.mainSectionId === "handisport" ||
    record.mainSectionId === "sport-adapte" ||
    record.handisportPracticeLevel
  ) {
    return "yes";
  }
  return "no";
}

function resolveCompetitorKey(record: AnalyticsRegistrationRecord): string {
  return record.wantsCompetitorExtras === true ? "yes" : "no";
}

function resolveMinorKey(record: AnalyticsRegistrationRecord): string {
  if (record.isMinor === true) return "minor";
  if (record.isMinor === false) return "adult";
  return "unknown";
}

function buildTopBucket(
  counts: Map<string, number>,
  unknownCount: number,
  topN: number = TOP_N
): TopCountBucket {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN).map(([label, count]) => ({ label, count }));
  const other = sorted.slice(topN).reduce((sum, [, count]) => sum + count, 0);
  return { top, other, unknown: unknownCount };
}

export function matchesAnalyticsFilters(
  record: AnalyticsRegistrationRecord,
  filters: AnalyticsFilters
): boolean {
  if (filters.status !== "all" && record.status !== filters.status) {
    return false;
  }
  if (filters.mainSectionId && record.mainSectionId !== filters.mainSectionId) {
    return false;
  }
  if (filters.sex && record.sex !== filters.sex) {
    return false;
  }
  if (filters.wasSqyMemberLastYear) {
    if (resolveRenewalKey(record) !== filters.wasSqyMemberLastYear) {
      return false;
    }
  }
  return true;
}

export function filterAnalyticsRecords(
  records: AnalyticsRegistrationRecord[],
  filters: AnalyticsFilters
): AnalyticsRegistrationRecord[] {
  return records.filter((record) => matchesAnalyticsFilters(record, filters));
}

export function aggregateRegistrationAnalytics(
  records: AnalyticsRegistrationRecord[],
  seasonLabel: string,
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): RegistrationAnalyticsSummary {
  const sex: CountBucket = {};
  const ageBrackets: CountBucket = {};
  const ffttCategory: CountBucket = {};
  const mainSection: CountBucket = {};
  const wasSqyMemberLastYear: CountBucket = {};
  const handisport: CountBucket = {};
  const competitor: CountBucket = {};
  const paymentAids: CountBucket = { none: 0 };
  const additionalSections: CountBucket = {};
  const isMinor: CountBucket = {};
  const status: CountBucket = {};
  const cityCounts = new Map<string, number>();
  const postalCounts = new Map<string, number>();
  let cityUnknown = 0;
  let postalUnknown = 0;

  for (const record of records) {
    increment(sex, resolveSexKey(record));

    const bracketId = resolveAgeBracketId(record.birthDate, seasonLabel, brackets);
    increment(ageBrackets, bracketId);

    const ffttKey = record.ffttCategorie ?? "unknown";
    increment(ffttCategory, ffttKey);

    const sectionKey = record.mainSectionId ?? "unknown";
    increment(mainSection, sectionKey);

    increment(wasSqyMemberLastYear, resolveRenewalKey(record));
    increment(handisport, resolveHandisportKey(record));
    increment(competitor, resolveCompetitorKey(record));
    increment(isMinor, resolveMinorKey(record));
    increment(status, record.status ?? "unknown");

    const city = normalizeCity(record.city);
    if (city) {
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    } else {
      cityUnknown += 1;
    }

    const postal = normalizePostalCode(record.postalCode);
    if (postal) {
      postalCounts.set(postal, (postalCounts.get(postal) ?? 0) + 1);
    } else {
      postalUnknown += 1;
    }

    const aidTypes = record.paymentAidTypes ?? [];
    if (aidTypes.length === 0) {
      paymentAids.none = (paymentAids.none ?? 0) + 1;
    } else {
      for (const type of aidTypes) {
        increment(paymentAids, type);
      }
    }

    for (const sectionId of record.additionalSectionIds ?? []) {
      increment(additionalSections, sectionId);
    }
  }

  return {
    total: records.length,
    sex,
    ageBrackets,
    ffttCategory,
    mainSection,
    city: buildTopBucket(cityCounts, cityUnknown),
    postalCode: buildTopBucket(postalCounts, postalUnknown),
    wasSqyMemberLastYear,
    handisport,
    competitor,
    paymentAids,
    additionalSections,
    isMinor,
    status,
  };
}

export function countBucketToChartData(
  bucket: CountBucket,
  labelMap: Record<string, string> = {},
  order?: string[]
): { id: string; label: string; value: number }[] {
  const keys = order ?? Object.keys(bucket).sort((a, b) => (bucket[b] ?? 0) - (bucket[a] ?? 0));
  return keys
    .filter((key) => (bucket[key] ?? 0) > 0)
    .map((key) => ({
      id: key,
      label: labelMap[key] ?? key,
      value: bucket[key] ?? 0,
    }));
}

export function topBucketToChartData(bucket: TopCountBucket): { id: string; label: string; value: number }[] {
  const items = bucket.top.map((item) => ({
    id: item.label,
    label: item.label,
    value: item.count,
  }));
  if (bucket.other > 0) {
    items.push({ id: "other", label: "Autres", value: bucket.other });
  }
  if (bucket.unknown > 0) {
    items.push({ id: "unknown", label: "Non renseigné", value: bucket.unknown });
  }
  return items;
}

export function sectionLabel(sectionId: string, sectionLabels: Record<string, string>): string {
  if (sectionId === "unknown") return "Non renseigné";
  return sectionLabels[sectionId] ?? sectionId;
}

export function paymentAidLabel(type: string): string {
  const labels: Record<string, string> = {
    pass_sport: "Pass Sport",
    pass_plus: "Pass Plus",
    labaz: "Labaz",
    aide_municipale: "Aide municipale",
    none: "Aucune aide",
  };
  return labels[type] ?? type;
}

export const ANALYTICS_LABELS = {
  sex: SEX_LABELS,
  renewal: RENEWAL_LABELS,
  yesNo: YES_NO_LABELS,
  minor: MINOR_LABELS,
};

export function ageBracketChartOrder(brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS): string[] {
  return orderedAgeBracketIds(brackets);
}

export function ageBracketChartLabels(
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): Record<string, string> {
  const labels: Record<string, string> = { unknown: "Non renseigné" };
  for (const bracket of brackets) {
    labels[bracket.id] = bracket.label;
  }
  return labels;
}

export { ageBracketLabel };
