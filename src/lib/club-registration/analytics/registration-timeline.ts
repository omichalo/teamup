import type { AnalyticsRegistrationRecord } from "./types";

export type RegistrationTimelinePoint = {
  /** Clé ISO jour (Europe/Paris). */
  date: string;
  /** Libellé court pour l'axe (ex. 12/09). */
  label: string;
  dailyCount: number;
  cumulativeCount: number;
};

export type RegistrationTimeline = {
  points: RegistrationTimelinePoint[];
  totalWithDate: number;
  totalUnknownDate: number;
};

const PARIS_TZ = "Europe/Paris";

/** Extrait la date civile (YYYY-MM-DD) à Paris à partir d'un instant ISO. */
export function toRegistrationDateKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS_TZ }).format(new Date(ms));
}

function formatTimelineLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  if (!month || !day) return dateKey;
  return `${day}/${month}`;
}

export function buildRegistrationTimeline(
  records: AnalyticsRegistrationRecord[]
): RegistrationTimeline {
  const daily = new Map<string, number>();
  let unknown = 0;

  for (const record of records) {
    if (!record.submittedAt) {
      unknown += 1;
      continue;
    }
    const dateKey = toRegistrationDateKey(record.submittedAt);
    if (!dateKey) {
      unknown += 1;
      continue;
    }
    daily.set(dateKey, (daily.get(dateKey) ?? 0) + 1);
  }

  const sortedDates = [...daily.keys()].sort();
  let cumulative = 0;
  const points: RegistrationTimelinePoint[] = sortedDates.map((date) => {
    const dailyCount = daily.get(date) ?? 0;
    cumulative += dailyCount;
    return {
      date,
      label: formatTimelineLabel(date),
      dailyCount,
      cumulativeCount: cumulative,
    };
  });

  return {
    points,
    totalWithDate: records.length - unknown,
    totalUnknownDate: unknown,
  };
}
