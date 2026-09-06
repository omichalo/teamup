import { REGISTRATION_STATUS_LABELS } from "@/lib/club-registration/registration-status";
import {
  ANALYTICS_LABELS,
  ageBracketChartLabels,
  paymentAidLabel,
  sectionLabel,
} from "./aggregate";
import type { CountBucket, RegistrationAnalyticsSummary, TopCountBucket } from "./types";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function appendBucketRows(
  rows: string[],
  metric: string,
  bucket: CountBucket,
  labelMap: Record<string, string> = {}
): void {
  const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of entries) {
    if (count <= 0) continue;
    const label = labelMap[key] ?? key;
    rows.push(
      [escapeCsvCell(metric), escapeCsvCell(key), escapeCsvCell(label), String(count)].join(";")
    );
  }
}

function appendTopBucketRows(rows: string[], metric: string, bucket: TopCountBucket): void {
  for (const item of bucket.top) {
    rows.push(
      [escapeCsvCell(metric), escapeCsvCell(item.label), escapeCsvCell(item.label), String(item.count)].join(
        ";"
      )
    );
  }
  if (bucket.other > 0) {
    rows.push([escapeCsvCell(metric), "other", "Autres", String(bucket.other)].join(";"));
  }
  if (bucket.unknown > 0) {
    rows.push(
      [escapeCsvCell(metric), "unknown", "Non renseigné", String(bucket.unknown)].join(";")
    );
  }
}

/** CSV agrégé (pas de PII) pour kit AG / partage bureau. */
export function buildAnalyticsSummaryCsv(
  summary: RegistrationAnalyticsSummary,
  sectionLabels: Record<string, string>,
  seasonLabel: string
): string {
  const rows: string[] = ["metric;key;label;count"];
  rows.push(["total", "total", `Saison ${seasonLabel}`, String(summary.total)].join(";"));

  appendBucketRows(rows, "status", summary.status, {
    ...REGISTRATION_STATUS_LABELS,
    unknown: "Non renseigné",
  });
  appendBucketRows(rows, "sex", summary.sex, ANALYTICS_LABELS.sex);
  appendBucketRows(rows, "renewal", summary.wasSqyMemberLastYear, ANALYTICS_LABELS.renewal);
  appendBucketRows(rows, "isMinor", summary.isMinor, ANALYTICS_LABELS.minor);
  appendBucketRows(rows, "handisport", summary.handisport, ANALYTICS_LABELS.handisport);
  appendBucketRows(rows, "competitor", summary.competitor, ANALYTICS_LABELS.yesNo);
  appendBucketRows(
    rows,
    "mainSection",
    summary.mainSection,
    Object.fromEntries(
      Object.keys(summary.mainSection).map((id) => [id, sectionLabel(id, sectionLabels)])
    )
  );
  appendBucketRows(rows, "ageBracket", summary.ageBrackets, ageBracketChartLabels());
  appendBucketRows(rows, "ffttCategory", summary.ffttCategory, { unknown: "Sans licence FFTT" });
  appendBucketRows(rows, "paymentAids", summary.paymentAids, {
    none: paymentAidLabel("none"),
  });
  appendTopBucketRows(rows, "city", summary.city);
  appendTopBucketRows(rows, "postalCode", summary.postalCode);

  return `\uFEFF${rows.join("\r\n")}`;
}

export function buildAnalyticsExportFilename(seasonLabel: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const season = seasonLabel.trim().replace(/[^\w.-]+/g, "_") || "saison";
  return `statistiques-adherents-${season}-${stamp}.csv`;
}

export function downloadAnalyticsCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
