import type { CampSlot } from "@/lib/camps/types";
import { isoWeekdayFromYmd } from "./calendar";
import type { AttendanceSlotOption } from "./types";

export function campSlotToAttendanceOption(
  slot: CampSlot,
  nowMinutes: number
): AttendanceSlotOption {
  const weekday = isoWeekdayFromYmd(slot.date);
  return {
    slotId: slot.id,
    label: `[Stage] ${slot.label}`,
    siteId: slot.siteId,
    siteLabel: slot.siteLabel,
    weekday,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
    highlighted:
      nowMinutes >= slot.startMinutes - 60 && nowMinutes < slot.endMinutes,
    enrollmentsClosed: false,
    cancelled: slot.cancelled,
    source: "camp",
    campId: slot.campId,
  };
}

export function mergeAttendanceSlotOptions(
  training: AttendanceSlotOption[],
  camp: AttendanceSlotOption[]
): AttendanceSlotOption[] {
  return [...training, ...camp].sort((a, b) => {
    if (a.siteLabel !== b.siteLabel) {
      return a.siteLabel.localeCompare(b.siteLabel, "fr");
    }
    return a.startMinutes - b.startMinutes;
  });
}
