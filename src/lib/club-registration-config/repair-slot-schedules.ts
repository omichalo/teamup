import type { RegistrationConfigV1, RegistrationSiteSlot } from "./types";
import { isOpenEnrollmentSlot } from "./open-enrollment";
import { resolveSlotSchedule } from "./slot-schedule";

export function withResolvedSlotSchedule(
  slot: RegistrationSiteSlot
): RegistrationSiteSlot {
  if (isOpenEnrollmentSlot(slot)) {
    return {
      id: slot.id,
      label: slot.label,
      sortOrder: slot.sortOrder,
      enabled: slot.enabled,
      openEnrollment: true,
      ...(slot.enrollmentsClosed !== undefined
        ? { enrollmentsClosed: slot.enrollmentsClosed }
        : {}),
      ...(slot.capacity !== undefined ? { capacity: slot.capacity } : {}),
    };
  }
  const resolved = resolveSlotSchedule(slot);
  if (!resolved) {
    return slot;
  }
  return {
    ...slot,
    weekday: resolved.weekday,
    startMinutes: resolved.startMinutes,
    endMinutes: resolved.endMinutes,
  };
}

/** Complète weekday / horaires des créneaux absents des configs legacy. */
export function repairSlotSchedules(config: RegistrationConfigV1): RegistrationConfigV1 {
  return {
    ...config,
    sites: config.sites.map((site) => ({
      ...site,
      slots: site.slots.map(withResolvedSlotSchedule),
    })),
  };
}
