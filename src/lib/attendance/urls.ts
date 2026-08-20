import { isYmd } from "./calendar";

export function attendancePickerHref(date?: string): string {
  if (date && isYmd(date)) {
    return `/club/presences?date=${encodeURIComponent(date)}`;
  }
  return "/club/presences";
}

export function attendanceSessionHref(date: string, slotId: string): string {
  const params = new URLSearchParams({ date, slot: slotId });
  return `/club/presences/seance?${params.toString()}`;
}

export function readAttendanceDateParam(value: string | null, fallback: string): string {
  return value && isYmd(value) ? value : fallback;
}
