import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { isoWeekDates } from "./calendar";
import { listSlotsForDate } from "./slots-for-date";
import type { AttendanceSlotOption, AttendanceWeekSummary } from "./types";

export type CancellationTarget = {
  date: string;
  slotId: string;
  siteId: string;
};

export type CancellationScope = "slot" | "day" | "week";

export function cancellationKey(date: string, slotId: string): string {
  return `${date}__${slotId}`;
}

export function cancelledKeySet(
  cancellations: ReadonlyArray<{ date: string; slotId: string }>
): Set<string> {
  return new Set(cancellations.map((item) => cancellationKey(item.date, item.slotId)));
}

export function applyCancellationsToSlots(
  slots: AttendanceSlotOption[],
  cancelledKeys: ReadonlySet<string>,
  dateYmd: string
): AttendanceSlotOption[] {
  return slots.map((slot) => ({
    ...slot,
    cancelled: cancelledKeys.has(cancellationKey(dateYmd, slot.slotId)),
  }));
}

export function listCatalogSlotsForDate(
  config: RegistrationConfigV1,
  dateYmd: string,
  nowMinutes: number
): AttendanceSlotOption[] {
  return listSlotsForDate(config, dateYmd, nowMinutes).map((slot) => ({
    ...slot,
    cancelled: false,
  }));
}

export function resolveCancellationTargets(params: {
  config: RegistrationConfigV1;
  date: string;
  scope: CancellationScope;
  slotId?: string | undefined;
  nowMinutes?: number;
}): CancellationTarget[] {
  const nowMinutes = params.nowMinutes ?? 12 * 60;
  if (params.scope === "slot") {
    if (!params.slotId) {
      return [];
    }
    const daySlots = listCatalogSlotsForDate(params.config, params.date, nowMinutes);
    const slot = daySlots.find((item) => item.slotId === params.slotId);
    if (!slot) {
      return [];
    }
    return [{ date: params.date, slotId: slot.slotId, siteId: slot.siteId }];
  }

  if (params.scope === "day") {
    return listCatalogSlotsForDate(params.config, params.date, nowMinutes).map((slot) => ({
      date: params.date,
      slotId: slot.slotId,
      siteId: slot.siteId,
    }));
  }

  const targets: CancellationTarget[] = [];
  for (const day of isoWeekDates(params.date)) {
    for (const slot of listCatalogSlotsForDate(params.config, day, nowMinutes)) {
      targets.push({ date: day, slotId: slot.slotId, siteId: slot.siteId });
    }
  }
  return targets;
}

export function filterActiveTargets(
  targets: readonly CancellationTarget[],
  cancelledKeys: ReadonlySet<string>
): CancellationTarget[] {
  return targets.filter((target) => !cancelledKeys.has(cancellationKey(target.date, target.slotId)));
}

export function filterCancelledTargets(
  targets: readonly CancellationTarget[],
  cancelledKeys: ReadonlySet<string>
): CancellationTarget[] {
  return targets.filter((target) => cancelledKeys.has(cancellationKey(target.date, target.slotId)));
}

export function buildWeekSummary(params: {
  date: string;
  config: RegistrationConfigV1;
  cancelledKeys: ReadonlySet<string>;
  nowMinutes?: number;
}): AttendanceWeekSummary {
  const nowMinutes = params.nowMinutes ?? 12 * 60;
  const weekDates = isoWeekDates(params.date);
  let weekActiveCount = 0;
  let weekCancelledCount = 0;
  for (const day of weekDates) {
    for (const slot of listCatalogSlotsForDate(params.config, day, nowMinutes)) {
      if (params.cancelledKeys.has(cancellationKey(day, slot.slotId))) {
        weekCancelledCount += 1;
      } else {
        weekActiveCount += 1;
      }
    }
  }
  return {
    weekStart: weekDates[0] ?? params.date,
    weekEnd: weekDates[6] ?? params.date,
    weekActiveCount,
    weekCancelledCount,
  };
}

export function countCancelledWeekdayOccurrences(params: {
  weekdayDates: readonly string[];
  cancelledDates: ReadonlySet<string>;
}): number {
  let count = 0;
  for (const date of params.weekdayDates) {
    if (params.cancelledDates.has(date)) {
      count += 1;
    }
  }
  return count;
}
