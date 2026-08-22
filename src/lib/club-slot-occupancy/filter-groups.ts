import { SLOT_FILL_STATUS_HELP, type SlotFillStatus, type SlotOccupancySiteGroup } from "./types";

export type OccupancyStatusFilter = "all" | SlotFillStatus;

export const OCCUPANCY_STATUS_FILTER_OPTIONS: {
  value: OccupancyStatusFilter;
  label: string;
  help: string;
}[] = [
  {
    value: "all",
    label: "Tous",
    help: "Tous les créneaux, quel que soit le remplissage.",
  },
  { value: "over", label: "Surcharge", help: SLOT_FILL_STATUS_HELP.over },
  { value: "full", label: "Complet", help: SLOT_FILL_STATUS_HELP.full },
  { value: "near", label: "Presque complet", help: SLOT_FILL_STATUS_HELP.near },
  { value: "ok", label: "Places dispo", help: SLOT_FILL_STATUS_HELP.ok },
  { value: "unset", label: "Non paramétré", help: SLOT_FILL_STATUS_HELP.unset },
];

export type OccupancyGroupStats = {
  total: number;
  over: number;
  full: number;
  near: number;
  enrollmentsClosed: number;
};

export function occupancyGroupStats(group: SlotOccupancySiteGroup): OccupancyGroupStats {
  return {
    total: group.slots.length,
    over: group.slots.filter((slot) => slot.status === "over").length,
    full: group.slots.filter((slot) => slot.status === "full").length,
    near: group.slots.filter((slot) => slot.status === "near").length,
    enrollmentsClosed: group.slots.filter((slot) => slot.enrollmentsClosed).length,
  };
}

export function defaultExpandedSiteIds(groups: readonly SlotOccupancySiteGroup[]): Set<string> {
  return new Set(
    groups.filter((group) => group.slots.some((slot) => slot.status === "over")).map((group) => group.siteId)
  );
}

export function patchOccupancyEnrollmentsClosed(
  groups: readonly SlotOccupancySiteGroup[],
  slotId: string,
  enrollmentsClosed: boolean
): SlotOccupancySiteGroup[] {
  return groups.map((group) => ({
    ...group,
    slots: group.slots.map((slot) =>
      slot.slotId === slotId ? { ...slot, enrollmentsClosed } : slot
    ),
  }));
}

export function filterOccupancyGroups(
  groups: readonly SlotOccupancySiteGroup[],
  options: { status: OccupancyStatusFilter; query: string }
): SlotOccupancySiteGroup[] {
  const needle = options.query.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      slots: group.slots.filter((slot) => {
        if (options.status !== "all" && slot.status !== options.status) {
          return false;
        }
        if (!needle) {
          return true;
        }
        const haystack = [slot.label, slot.scheduleLabel ?? "", group.siteLabel, group.gymnasiumName ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      }),
    }))
    .filter((group) => group.slots.length > 0);
}
