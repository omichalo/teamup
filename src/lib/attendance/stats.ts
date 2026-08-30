import type {
  AttendanceMark,
  AttendancePlayerStat,
  AttendanceSessionPayload,
  AttendanceSlotStats,
} from "./types";
import {
  addDaysYmd,
  isoWeekdayFromYmd,
  maxYmd,
  minYmd,
  seasonBoundsYmd,
  ymdFromTimestamp,
} from "./calendar";
import type { IsoWeekday } from "@/lib/club-registration-config/slot-schedule";
import { ATTENDANCE_ALERT_LABELS, type AttendanceAlert } from "./constants";

function listWeekdayDatesInRange(
  fromYmd: string,
  toYmd: string,
  weekday: IsoWeekday
): string[] {
  if (fromYmd > toYmd) {
    return [];
  }
  const dates: string[] = [];
  let cursor = fromYmd;
  while (cursor <= toYmd) {
    if (isoWeekdayFromYmd(cursor) === weekday) {
      dates.push(cursor);
    }
    cursor = addDaysYmd(cursor, 1);
  }
  return dates;
}

export function buildSlotStats(params: {
  date: string;
  slotId: string;
  weekday: IsoWeekday;
  seasonLabel: string;
  registrations: Array<{ id: string; data: Record<string, unknown> }>;
  marks: AttendanceMark[];
  cancelledDates?: ReadonlySet<string> | undefined;
}): AttendanceSlotStats {
  const bounds = seasonBoundsYmd(params.seasonLabel);
  const toDate = minYmd(params.date, bounds.end);
  const cancelledDates = params.cancelledDates ?? new Set<string>();
  const enrolledMarks = params.marks.filter((mark) => mark.kind === "enrolled");
  const presentByReg = new Map<string, number>();
  for (const mark of enrolledMarks) {
    if (!mark.registrationId || mark.date > params.date) {
      continue;
    }
    if (cancelledDates.has(mark.date)) {
      continue;
    }
    presentByReg.set(mark.registrationId, (presentByReg.get(mark.registrationId) ?? 0) + 1);
  }

  const todayMarks = params.marks.filter((mark) => mark.date === params.date);
  const players: AttendancePlayerStat[] = params.registrations.map((item) => {
    const submitted = ymdFromTimestamp(item.data.submittedAt) ?? bounds.start;
    const from = maxYmd(bounds.start, submitted);
    const weekdayDates = listWeekdayDatesInRange(from, toDate, params.weekday);
    const cancelledInRange = weekdayDates.filter((day) => cancelledDates.has(day)).length;
    const expectedCount = Math.max(0, weekdayDates.length - cancelledInRange);
    const presentCount = presentByReg.get(item.id) ?? 0;
    const firstName = typeof item.data.firstName === "string" ? item.data.firstName : "";
    const lastName = typeof item.data.lastName === "string" ? item.data.lastName : "";
    return {
      registrationId: item.id,
      displayName: `${firstName} ${lastName}`.trim() || item.id,
      presentCount,
      expectedCount,
      rate: expectedCount > 0 ? presentCount / expectedCount : null,
    };
  });

  players.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  return {
    date: params.date,
    slotId: params.slotId,
    enrolled: params.registrations.length,
    presentEnrolled: todayMarks.filter((mark) => mark.kind === "enrolled").length,
    walkin: todayMarks.filter((mark) => mark.kind === "walkin").length,
    guest: todayMarks.filter((mark) => mark.kind === "guest").length,
    players,
  };
}

export function sessionToExportRows(session: AttendanceSessionPayload): Array<{
  date: string;
  siteLabel: string;
  slotLabel: string;
  displayName: string;
  kind: string;
  alerts: AttendanceAlert[];
}> {
  const present = [...session.roster.filter((person) => person.present), ...session.extras];
  return present.map((person) => ({
    date: session.date,
    siteLabel: session.slot.siteLabel,
    slotLabel: session.slot.label,
    displayName: person.displayName,
    kind: person.kind,
    alerts: person.alerts,
  }));
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAttendanceExportCsv(rows: Array<{
  date: string;
  siteLabel: string;
  slotLabel: string;
  displayName: string;
  kind: string;
  alerts: AttendanceAlert[];
}>): string {
  const header = ["date", "gymnase", "creneau", "nom", "type", "alertes"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.date),
        csvEscape(row.siteLabel),
        csvEscape(row.slotLabel),
        csvEscape(row.displayName),
        csvEscape(row.kind),
        csvEscape(row.alerts.map((alert) => ATTENDANCE_ALERT_LABELS[alert]).join(" | ")),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
