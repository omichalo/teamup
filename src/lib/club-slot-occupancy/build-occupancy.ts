import { mapRegistrationToRosterPerson } from "@/lib/attendance/roster";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  formatSlotScheduleSummary,
  resolveSlotSchedule,
} from "@/lib/club-registration-config/slot-schedule";
import { sortBySortOrder } from "@/lib/club-registration-config/sort-order";
import { computeSlotFill } from "./fill-rate";
import type {
  SlotOccupancyEnrolledPerson,
  SlotOccupancySiteGroup,
  SlotOccupancySummary,
} from "./types";

function compareOccupancySlots(a: SlotOccupancySummary, b: SlotOccupancySummary): number {
  const weekdayA = a.weekday ?? 99;
  const weekdayB = b.weekday ?? 99;
  if (weekdayA !== weekdayB) {
    return weekdayA - weekdayB;
  }
  const startA = a.startMinutes ?? 24 * 60;
  const startB = b.startMinutes ?? 24 * 60;
  if (startA !== startB) {
    return startA - startB;
  }
  return a.label.localeCompare(b.label, "fr");
}

export function buildOccupancyGroups(
  config: RegistrationConfigV1,
  counts: Map<string, number>
): SlotOccupancySiteGroup[] {
  return sortBySortOrder(config.sites).map((site) => {
    const slots: SlotOccupancySummary[] = site.slots.map((slot) => {
      const schedule = resolveSlotSchedule(slot);
      const fill = computeSlotFill(counts.get(slot.id) ?? 0, slot.capacity);
      return {
        slotId: slot.id,
        label: slot.label,
        siteId: site.id,
        siteLabel: site.label,
        gymnasiumName: site.gymnasiumName,
        weekday: schedule?.weekday ?? null,
        startMinutes: schedule?.startMinutes ?? null,
        endMinutes: schedule?.endMinutes ?? null,
        scheduleLabel: schedule ? formatSlotScheduleSummary(schedule) : null,
        enabled: slot.enabled,
        enrollmentsClosed: slot.enrollmentsClosed === true,
        ...fill,
      };
    });
    slots.sort(compareOccupancySlots);
    return {
      siteId: site.id,
      siteLabel: site.label,
      gymnasiumName: site.gymnasiumName,
      slots,
    };
  });
}

export function findOccupancySlot(
  groups: SlotOccupancySiteGroup[],
  slotId: string
): SlotOccupancySummary | null {
  for (const group of groups) {
    const slot = group.slots.find((item) => item.slotId === slotId);
    if (slot) {
      return slot;
    }
  }
  return null;
}

export function mapRegistrationToOccupancyPerson(
  id: string,
  data: Record<string, unknown>
): SlotOccupancyEnrolledPerson {
  const roster = mapRegistrationToRosterPerson(id, data, false, false);
  return {
    personKey: roster.personKey,
    registrationId: id,
    firstName: roster.firstName,
    lastName: roster.lastName,
    displayName: roster.displayName,
    age: roster.age,
    alerts: roster.alerts,
  };
}

export function sortOccupancyPeople(
  people: SlotOccupancyEnrolledPerson[]
): SlotOccupancyEnrolledPerson[] {
  return [...people].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, "fr") ||
      a.firstName.localeCompare(b.firstName, "fr")
  );
}
