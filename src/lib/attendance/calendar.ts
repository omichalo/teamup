import { ATTENDANCE_TIMEZONE, YMD_RE } from "./constants";
import type { IsoWeekday } from "@/lib/club-registration-config/slot-schedule";

export function isYmd(value: string): boolean {
  if (!YMD_RE.test(value)) {
    return false;
  }
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(5, 7), 10);
  const day = Number.parseInt(value.slice(8, 10), 10);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

export function todayYmdInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMinutesInParis(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ATTENDANCE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

export function isoWeekdayFromYmd(ymd: string): IsoWeekday {
  const year = Number.parseInt(ymd.slice(0, 4), 10);
  const month = Number.parseInt(ymd.slice(5, 7), 10);
  const day = Number.parseInt(ymd.slice(8, 10), 10);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as IsoWeekday;
}

export function ymdFromTimestamp(value: unknown, timeZone = ATTENDANCE_TIMEZONE): string | null {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : value &&
            typeof value === "object" &&
            "toDate" in value &&
            typeof (value as { toDate: () => Date }).toDate === "function"
          ? (value as { toDate: () => Date }).toDate()
          : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysYmd(ymd: string, days: number): string {
  const year = Number.parseInt(ymd.slice(0, 4), 10);
  const month = Number.parseInt(ymd.slice(5, 7), 10);
  const day = Number.parseInt(ymd.slice(8, 10), 10);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** Lundi (ISO) de la semaine contenant `ymd`. */
export function isoWeekStartYmd(ymd: string): string {
  const weekday = isoWeekdayFromYmd(ymd);
  return addDaysYmd(ymd, 1 - weekday);
}

/** Les 7 dates YMD de la semaine ISO (lundi → dimanche) contenant `ymd`. */
export function isoWeekDates(ymd: string): string[] {
  const start = isoWeekStartYmd(ymd);
  return Array.from({ length: 7 }, (_, index) => addDaysYmd(start, index));
}

export function countIsoWeekdayOccurrences(
  fromYmd: string,
  toYmd: string,
  weekday: IsoWeekday
): number {
  if (fromYmd > toYmd) {
    return 0;
  }
  let count = 0;
  let cursor = fromYmd;
  while (cursor <= toYmd) {
    if (isoWeekdayFromYmd(cursor) === weekday) {
      count += 1;
    }
    cursor = addDaysYmd(cursor, 1);
  }
  return count;
}

const SEASON_LABEL_RE = /^(\d{4})\s*[-/]\s*(\d{2,4})$/;

export function seasonBoundsYmd(seasonLabel: string): { start: string; end: string } {
  const match = SEASON_LABEL_RE.exec(seasonLabel.trim());
  const startYear = match ? Number.parseInt(match[1], 10) : 2025;
  const year = Number.isFinite(startYear) ? startYear : 2025;
  return {
    start: `${year}-09-01`,
    end: `${year + 1}-08-31`,
  };
}

export function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minYmd(a: string, b: string): string {
  return a <= b ? a : b;
}
