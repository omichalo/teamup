import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  formatSlotScheduleSummary,
  resolveSlotSchedule,
} from "@/lib/club-registration-config/slot-schedule";

/**
 * Libellé lisible d'un créneau (site · jour horaire · intitulé),
 * sans exposer l'id technique (ex. guy-lun-1930-…).
 */
export function formatAttendanceSlotDisplay(
  config: RegistrationConfigV1,
  slotId: string
): string {
  for (const site of config.sites) {
    const slot = site.slots.find((item) => item.id === slotId);
    if (!slot) {
      continue;
    }
    const parts: string[] = [site.label];
    const schedule = resolveSlotSchedule(slot);
    if (schedule) {
      parts.push(formatSlotScheduleSummary(schedule));
    }
    if (slot.label.trim()) {
      parts.push(slot.label.trim());
    }
    return parts.join(" · ");
  }
  return "Créneau inconnu";
}
