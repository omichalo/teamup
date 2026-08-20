/**
 * Horaires structurés des créneaux d'entraînement (ISO weekday + minutes depuis minuit).
 * Permet de lister les créneaux d'un jour calendaire sans parser le libellé à chaque requête.
 */

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SlotSchedule = {
  weekday: IsoWeekday;
  startMinutes: number;
  endMinutes: number;
};

export const ISO_WEEKDAY_LABELS: Record<IsoWeekday, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

const WEEKDAY_FROM_FR: Record<string, IsoWeekday> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

const WEEKDAY_FROM_TOKEN: Record<string, IsoWeekday> = {
  lun: 1,
  mar: 2,
  mer: 3,
  jeu: 4,
  ven: 5,
  sam: 6,
  dim: 7,
};

const LABEL_RE =
  /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*\/\s*(\d{1,2})h(\d{2})\s*[–\-—−]\s*(\d{1,2})h(\d{2})/i;

const ID_RE = /(?:^|-)(lun|mar|mer|jeu|ven|sam|dim)-(\d{3,4})(?:-|$)/i;

const MINUTES_IN_DAY = 24 * 60;
const DEFAULT_DURATION_MINUTES = 90;

export function isIsoWeekday(value: unknown): value is IsoWeekday {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

export function isValidDayMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < MINUTES_IN_DAY
  );
}

export function minutesFromHourMinute(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function formatMinutesAsLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour}h${minute.toString().padStart(2, "0")}`;
}

export function formatMinutesAsInput(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function parseTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return minutesFromHourMinute(hour, minute);
}

function parseHhMm(hourRaw: string, minuteRaw: string): number | null {
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return minutesFromHourMinute(hour, minute);
}

export function parseSlotScheduleFromLabel(label: string): SlotSchedule | null {
  const match = LABEL_RE.exec(label.trim());
  if (!match) {
    return null;
  }
  const weekday = WEEKDAY_FROM_FR[match[1].toLowerCase()];
  if (!weekday) {
    return null;
  }
  const startMinutes = parseHhMm(match[2], match[3]);
  const endMinutes = parseHhMm(match[4], match[5]);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return null;
  }
  return { weekday, startMinutes, endMinutes };
}

export function parseSlotScheduleFromId(id: string): SlotSchedule | null {
  const match = ID_RE.exec(id);
  if (!match) {
    return null;
  }
  const weekday = WEEKDAY_FROM_TOKEN[match[1].toLowerCase()];
  if (!weekday) {
    return null;
  }
  const padded = match[2].length === 3 ? `0${match[2]}` : match[2];
  const startMinutes = parseHhMm(padded.slice(0, 2), padded.slice(2, 4));
  if (startMinutes == null) {
    return null;
  }
  const endMinutes = Math.min(startMinutes + DEFAULT_DURATION_MINUTES, MINUTES_IN_DAY - 1);
  if (endMinutes <= startMinutes) {
    return null;
  }
  return { weekday, startMinutes, endMinutes };
}

export function resolveSlotSchedule(slot: {
  id: string;
  label: string;
  weekday?: number | undefined;
  startMinutes?: number | undefined;
  endMinutes?: number | undefined;
}): SlotSchedule | null {
  if (
    isIsoWeekday(slot.weekday) &&
    isValidDayMinutes(slot.startMinutes) &&
    isValidDayMinutes(slot.endMinutes) &&
    slot.endMinutes > slot.startMinutes
  ) {
    return {
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
    };
  }
  return parseSlotScheduleFromLabel(slot.label) ?? parseSlotScheduleFromId(slot.id);
}

export function formatSlotScheduleSummary(schedule: SlotSchedule): string {
  return `${ISO_WEEKDAY_LABELS[schedule.weekday]} ${formatMinutesAsLabel(schedule.startMinutes)}–${formatMinutesAsLabel(schedule.endMinutes)}`;
}
