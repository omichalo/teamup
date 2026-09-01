import {
  ageBracketLabel,
  DEFAULT_ANALYTICS_AGE_BRACKETS,
  resolveAgeBracketId,
  type AgeBracketDefinition,
} from "./age-brackets";
import { normalizeCity, normalizePostalCode } from "./normalize-city";
import type { AnalyticsRegistrationRecord, CrossTabAxis, CrossTabResult } from "./types";

const TOP_GEO_N = 8;

function resolveSex(record: AnalyticsRegistrationRecord): string {
  if (record.sex === "female") return "Femme";
  if (record.sex === "male") return "Homme";
  if (record.sex === "other") return "Autre";
  return "Non renseigné";
}

function resolveRenewal(record: AnalyticsRegistrationRecord): string {
  if (record.wasSqyMemberLastYear === true) return "Renouvellement";
  if (record.wasSqyMemberLastYear === false) return "Nouveau";
  return "Non renseigné";
}

function resolveHandisport(record: AnalyticsRegistrationRecord): string {
  if (
    record.mainSectionId === "handisport" ||
    record.mainSectionId === "sport-adapte" ||
    record.handisportPracticeLevel
  ) {
    return "Oui";
  }
  return "Non";
}

function resolveCompetitor(record: AnalyticsRegistrationRecord): string {
  return record.wantsCompetitorExtras === true ? "Oui" : "Non";
}

function resolveAxisValue(
  record: AnalyticsRegistrationRecord,
  axis: CrossTabAxis,
  seasonLabel: string,
  sectionLabels: Record<string, string>,
  geoTopLabels: { city: Set<string>; postalCode: Set<string> },
  brackets: AgeBracketDefinition[]
): string {
  switch (axis) {
    case "sex":
      return resolveSex(record);
    case "ageBracket":
      return ageBracketLabel(resolveAgeBracketId(record.birthDate, seasonLabel, brackets), brackets);
    case "mainSection":
      return record.mainSectionId
        ? (sectionLabels[record.mainSectionId] ?? record.mainSectionId)
        : "Non renseigné";
    case "ffttCategory":
      return record.ffttCategorie ?? "Non renseigné";
    case "city": {
      const city = normalizeCity(record.city);
      if (!city) return "Non renseigné";
      return geoTopLabels.city.has(city) ? city : "Autres";
    }
    case "postalCode": {
      const postal = normalizePostalCode(record.postalCode);
      if (!postal) return "Non renseigné";
      return geoTopLabels.postalCode.has(postal) ? postal : "Autres";
    }
    case "wasSqyMemberLastYear":
      return resolveRenewal(record);
    case "handisport":
      return resolveHandisport(record);
    case "competitor":
      return resolveCompetitor(record);
    default:
      return "Non renseigné";
  }
}

function buildGeoTopLabels(
  records: AnalyticsRegistrationRecord[],
  axis: "city" | "postalCode"
): Set<string> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const label =
      axis === "city"
        ? normalizeCity(record.city)
        : normalizePostalCode(record.postalCode);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GEO_N)
    .map(([label]) => label);
  return new Set(top);
}

export function buildCrossTab(
  records: AnalyticsRegistrationRecord[],
  rowAxis: CrossTabAxis,
  colAxis: CrossTabAxis,
  seasonLabel: string,
  sectionLabels: Record<string, string> = {},
  brackets: AgeBracketDefinition[] = DEFAULT_ANALYTICS_AGE_BRACKETS
): CrossTabResult {
  const geoTopLabels = {
    city: buildGeoTopLabels(records, "city"),
    postalCode: buildGeoTopLabels(records, "postalCode"),
  };

  const matrix = new Map<string, Map<string, number>>();
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();

  for (const record of records) {
    const row = resolveAxisValue(record, rowAxis, seasonLabel, sectionLabels, geoTopLabels, brackets);
    const col = resolveAxisValue(record, colAxis, seasonLabel, sectionLabels, geoTopLabels, brackets);

    if (!matrix.has(row)) matrix.set(row, new Map());
    const rowMap = matrix.get(row)!;
    rowMap.set(col, (rowMap.get(col) ?? 0) + 1);
    rowTotals.set(row, (rowTotals.get(row) ?? 0) + 1);
    colTotals.set(col, (colTotals.get(col) ?? 0) + 1);
  }

  const rowLabels = [...rowTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
  const colLabels = [...colTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  const counts = rowLabels.map((row) =>
    colLabels.map((col) => matrix.get(row)?.get(col) ?? 0)
  );

  return {
    rowLabels,
    colLabels,
    counts,
    rowTotals: rowLabels.map((row) => rowTotals.get(row) ?? 0),
    colTotals: colLabels.map((col) => colTotals.get(col) ?? 0),
  };
}

export const CROSS_TAB_AXIS_OPTIONS: { value: CrossTabAxis; label: string }[] = [
  { value: "sex", label: "Sexe" },
  { value: "ageBracket", label: "Tranche d'âge" },
  { value: "mainSection", label: "Section principale" },
  { value: "ffttCategory", label: "Catégorie FFTT" },
  { value: "city", label: "Ville (top)" },
  { value: "postalCode", label: "Code postal (top)" },
  { value: "wasSqyMemberLastYear", label: "Nouveau / renouvellement" },
  { value: "handisport", label: "Handisport" },
  { value: "competitor", label: "Compétiteur" },
];
