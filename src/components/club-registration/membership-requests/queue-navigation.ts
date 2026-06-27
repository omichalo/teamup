import type { RegistrationSummary } from "@/components/club-registration/membership-requests/types";

export type QueueAdvanceMode = "always" | "if_removed" | "never";

export type QueueReloadResult = {
  nextId: string | null;
  advanced: boolean;
};

export function pickAdjacentRegistrationId(
  currentId: string | null,
  list: RegistrationSummary[],
  direction: "next" | "previous"
): string | null {
  if (list.length === 0) {
    return null;
  }
  if (!currentId) {
    return list[0]?.id ?? null;
  }

  const currentIndex = list.findIndex((registration) => registration.id === currentId);
  if (currentIndex < 0) {
    return list[0]?.id ?? null;
  }

  if (direction === "next") {
    return list[Math.min(currentIndex + 1, list.length - 1)]?.id ?? null;
  }
  return list[Math.max(currentIndex - 1, 0)]?.id ?? null;
}

export function resolveSelectionAfterQueueReload(
  previousId: string,
  previousIndex: number,
  nextList: RegistrationSummary[],
  mode: QueueAdvanceMode
): string | null {
  if (nextList.length === 0) {
    return null;
  }

  if (mode === "never") {
    return nextList.some((registration) => registration.id === previousId)
      ? previousId
      : (nextList[Math.min(Math.max(previousIndex, 0), nextList.length - 1)]?.id ?? null);
  }

  if (mode === "if_removed") {
    if (nextList.some((registration) => registration.id === previousId)) {
      return previousId;
    }
    return nextList[Math.min(Math.max(previousIndex, 0), nextList.length - 1)]?.id ?? null;
  }

  if (previousIndex + 1 < nextList.length) {
    return nextList[previousIndex + 1]?.id ?? null;
  }
  if (nextList.some((registration) => registration.id === previousId)) {
    return previousId;
  }
  return nextList[Math.min(Math.max(previousIndex, 0), nextList.length - 1)]?.id ?? null;
}

export function getQueueMetrics(
  registrations: RegistrationSummary[],
  selectedId: string | null
): {
  position: number;
  total: number;
  remaining: number;
  selectedIndex: number;
} {
  const total = registrations.length;
  if (!selectedId || total === 0) {
    return { position: 0, total, remaining: total, selectedIndex: -1 };
  }

  const selectedIndex = registrations.findIndex((registration) => registration.id === selectedId);
  if (selectedIndex < 0) {
    return { position: 0, total, remaining: total, selectedIndex: -1 };
  }

  const position = selectedIndex + 1;
  return {
    position,
    total,
    remaining: Math.max(total - position, 0),
    selectedIndex,
  };
}
