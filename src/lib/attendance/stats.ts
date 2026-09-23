import type {
  AttendanceMark,
  AttendancePlayerStat,
  AttendanceSessionPayload,
  AttendanceSessionPoint,
  AttendanceSlotAnalytics,
  AttendanceSlotStats,
} from "./types";
import {
  maxYmd,
  minYmd,
  seasonBoundsYmd,
  ymdFromTimestamp,
} from "./calendar";
import type { IsoWeekday } from "@/lib/club-registration-config/slot-schedule";
import { ATTENDANCE_ALERT_LABELS, type AttendanceAlert } from "./constants";

type BuildSlotStatsParams = {
  date: string;
  slotId: string;
  weekday: IsoWeekday;
  seasonLabel: string;
  registrations: Array<{ id: string; data: Record<string, unknown> }>;
  marks: AttendanceMark[];
  cancelledDates?: ReadonlySet<string> | undefined;
};

function pointedSessionDates(
  marks: AttendanceMark[],
  date: string,
  cancelledDates: ReadonlySet<string>
): string[] {
  return [
    ...new Set(
      marks
        .map((mark) => mark.date)
        .filter((day) => day <= date && !cancelledDates.has(day))
    ),
  ].sort();
}

function buildPlayerStats(params: {
  date: string;
  seasonLabel: string;
  registrations: Array<{ id: string; data: Record<string, unknown> }>;
  marks: AttendanceMark[];
  cancelledDates: ReadonlySet<string>;
  pointedDates: string[];
}): AttendancePlayerStat[] {
  const bounds = seasonBoundsYmd(params.seasonLabel);
  const toDate = minYmd(params.date, bounds.end);
  const enrolledMarks = params.marks.filter((mark) => mark.kind === "enrolled");
  const presentByReg = new Map<string, number>();
  for (const mark of enrolledMarks) {
    if (!mark.registrationId || mark.date > params.date) {
      continue;
    }
    if (params.cancelledDates.has(mark.date)) {
      continue;
    }
    presentByReg.set(mark.registrationId, (presentByReg.get(mark.registrationId) ?? 0) + 1);
  }

  const players: AttendancePlayerStat[] = params.registrations.map((item) => {
    const submitted = ymdFromTimestamp(item.data.submittedAt) ?? bounds.start;
    const from = maxYmd(bounds.start, submitted);
    const expectedCount = params.pointedDates.filter(
      (day) => day >= from && day <= toDate
    ).length;
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
  return players;
}

export function buildSessionPoints(
  marks: AttendanceMark[],
  date: string,
  cancelledDates: ReadonlySet<string>
): AttendanceSessionPoint[] {
  const byDate = new Map<string, AttendanceSessionPoint>();
  for (const mark of marks) {
    if (mark.date > date || cancelledDates.has(mark.date)) {
      continue;
    }
    let point = byDate.get(mark.date);
    if (!point) {
      point = { date: mark.date, enrolled: 0, walkin: 0, guest: 0, total: 0 };
      byDate.set(mark.date, point);
    }
    if (mark.kind === "enrolled") {
      point.enrolled += 1;
    } else if (mark.kind === "walkin") {
      point.walkin += 1;
    } else if (mark.kind === "guest") {
      point.guest += 1;
    }
    point.total += 1;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildSlotStats(params: BuildSlotStatsParams): AttendanceSlotStats {
  const cancelledDates = params.cancelledDates ?? new Set<string>();
  const pointedDates = pointedSessionDates(params.marks, params.date, cancelledDates);
  const players = buildPlayerStats({
    date: params.date,
    seasonLabel: params.seasonLabel,
    registrations: params.registrations,
    marks: params.marks,
    cancelledDates,
    pointedDates,
  });
  const todayMarks = params.marks.filter((mark) => mark.date === params.date);

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

export function buildSlotAnalytics(
  params: BuildSlotStatsParams & { capacity?: number | undefined }
): AttendanceSlotAnalytics {
  const cancelledDates = params.cancelledDates ?? new Set<string>();
  const sessions = buildSessionPoints(params.marks, params.date, cancelledDates);
  const pointedDates = sessions.map((session) => session.date);
  const players = buildPlayerStats({
    date: params.date,
    seasonLabel: params.seasonLabel,
    registrations: params.registrations,
    marks: params.marks,
    cancelledDates,
    pointedDates,
  });

  const pointedSessionCount = sessions.length;
  const cancelledSessionCount = [...cancelledDates].filter((day) => day <= params.date).length;

  let seasonWalkinTotal = 0;
  let seasonGuestTotal = 0;
  let sumEnrolled = 0;
  let sumTotal = 0;
  let peakTotal: number | null = null;
  let peakDate: string | null = null;
  for (const session of sessions) {
    seasonWalkinTotal += session.walkin;
    seasonGuestTotal += session.guest;
    sumEnrolled += session.enrolled;
    sumTotal += session.total;
    if (peakTotal == null || session.total > peakTotal) {
      peakTotal = session.total;
      peakDate = session.date;
    }
  }

  const rates = players
    .map((player) => player.rate)
    .filter((rate): rate is number => rate != null);
  const avgPlayerRate =
    rates.length > 0 ? rates.reduce((acc, rate) => acc + rate, 0) / rates.length : null;

  const capacity =
    typeof params.capacity === "number" && params.capacity >= 1 ? params.capacity : null;
  const avgOccupancyVsCapacity =
    capacity != null && pointedSessionCount > 0
      ? sumTotal / pointedSessionCount / capacity
      : null;

  return {
    date: params.date,
    slotId: params.slotId,
    seasonLabel: params.seasonLabel,
    kpis: {
      pointedSessionCount,
      cancelledSessionCount,
      avgPresentEnrolled:
        pointedSessionCount > 0 ? sumEnrolled / pointedSessionCount : null,
      avgPresentTotal: pointedSessionCount > 0 ? sumTotal / pointedSessionCount : null,
      peakTotal,
      peakDate,
      seasonWalkinTotal,
      seasonGuestTotal,
      avgPlayerRate,
      avgOccupancyVsCapacity,
      capacity,
      enrolledCount: params.registrations.length,
    },
    sessions,
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
