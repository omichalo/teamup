import type { RegistrationConfigV1, RegistrationSiteSlot } from "@/lib/club-registration-config/types";
import { resolveSlotSchedule } from "@/lib/club-registration-config/slot-schedule";
import type { AttendanceSlotOption } from "./types";
import { isoWeekdayFromYmd } from "./calendar";

export function listSlotsForDate(
  config: RegistrationConfigV1,
  dateYmd: string,
  nowMinutes: number
): AttendanceSlotOption[] {
  const weekday = isoWeekdayFromYmd(dateYmd);
  const options: AttendanceSlotOption[] = [];

  for (const site of config.sites) {
    for (const slot of site.slots) {
      if (!slot.enabled) {
        continue;
      }
      const option = toSlotOption(site.id, site.label, site.gymnasiumName, slot, weekday);
      if (option) {
        options.push({ ...option, highlighted: false });
      }
    }
  }

  options.sort((a, b) => {
    if (a.siteLabel !== b.siteLabel) {
      return a.siteLabel.localeCompare(b.siteLabel, "fr");
    }
    return a.startMinutes - b.startMinutes;
  });

  const highlightId = pickHighlightedSlotId(options, nowMinutes);
  return options.map((option) => ({
    ...option,
    highlighted: option.slotId === highlightId,
  }));
}

function toSlotOption(
  siteId: string,
  siteLabel: string,
  gymnasiumName: string | undefined,
  slot: RegistrationSiteSlot,
  weekday: number
): Omit<AttendanceSlotOption, "highlighted"> | null {
  const schedule = resolveSlotSchedule(slot);
  if (!schedule || schedule.weekday !== weekday) {
    return null;
  }
  return {
    slotId: slot.id,
    label: slot.label,
    siteId,
    siteLabel,
    ...(gymnasiumName ? { gymnasiumName } : {}),
    weekday: schedule.weekday,
    startMinutes: schedule.startMinutes,
    endMinutes: schedule.endMinutes,
    enrollmentsClosed: slot.enrollmentsClosed === true,
  };
}

export function pickHighlightedSlotId(
  options: readonly Omit<AttendanceSlotOption, "highlighted">[],
  nowMinutes: number
): string | null {
  if (options.length === 0) {
    return null;
  }
  const notEnded = options.filter((slot) => nowMinutes < slot.endMinutes);
  const pool = notEnded.length > 0 ? notEnded : options;
  let best = pool[0];
  let bestDelta = Math.abs(best.startMinutes - nowMinutes);
  for (const slot of pool.slice(1)) {
    const delta = Math.abs(slot.startMinutes - nowMinutes);
    if (delta < bestDelta) {
      best = slot;
      bestDelta = delta;
    }
  }
  return best?.slotId ?? null;
}

export function findSlotOption(
  config: RegistrationConfigV1,
  slotId: string,
  dateYmd: string
): AttendanceSlotOption | null {
  const weekday = isoWeekdayFromYmd(dateYmd);
  for (const site of config.sites) {
    const slot = site.slots.find((item) => item.id === slotId);
    if (!slot) {
      continue;
    }
    const option = toSlotOption(site.id, site.label, site.gymnasiumName, slot, weekday);
    if (!option) {
      return {
        slotId: slot.id,
        label: slot.label,
        siteId: site.id,
        siteLabel: site.label,
        ...(site.gymnasiumName ? { gymnasiumName: site.gymnasiumName } : {}),
        weekday,
        startMinutes: 0,
        endMinutes: 0,
        highlighted: false,
        enrollmentsClosed: slot.enrollmentsClosed === true,
      };
    }
    return { ...option, highlighted: false };
  }
  return null;
}
