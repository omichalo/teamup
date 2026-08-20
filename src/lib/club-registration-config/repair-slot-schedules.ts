import type { RegistrationConfigV1, RegistrationSiteSlot } from "./types";
import { resolveSlotSchedule } from "./slot-schedule";

export function withResolvedSlotSchedule(
  slot: RegistrationSiteSlot
): RegistrationSiteSlot {
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
