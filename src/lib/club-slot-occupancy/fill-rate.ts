import type { SlotFillSnapshot, SlotFillStatus } from "./types";

/** Seuil à partir duquel un créneau est « presque complet » (sans l'être). */
export const NEAR_FULL_RATIO = 0.8;

export function computeSlotFill(
  enrolledCount: number,
  capacity: number | undefined
): SlotFillSnapshot {
  if (capacity == null) {
    return {
      enrolledCount,
      capacity: undefined,
      rate: null,
      status: "unset",
    };
  }

  const rate = capacity > 0 ? enrolledCount / capacity : null;
  let status: SlotFillStatus = "ok";
  if (enrolledCount > capacity) {
    status = "over";
  } else if (enrolledCount === capacity) {
    status = "full";
  } else if (rate != null && rate >= NEAR_FULL_RATIO) {
    status = "near";
  }

  return { enrolledCount, capacity, rate, status };
}

export function slotFillPercent(rate: number | null): number | null {
  if (rate == null || !Number.isFinite(rate)) {
    return null;
  }
  return Math.min(100, Math.round(rate * 100));
}
