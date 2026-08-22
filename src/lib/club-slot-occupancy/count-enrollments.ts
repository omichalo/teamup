export function readSlotIds(data: Record<string, unknown>): string[] {
  const value = data.slotIds;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function countEnrollmentsBySlotId(
  registrations: Array<{ data: Record<string, unknown> }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of registrations) {
    const seen = new Set<string>();
    for (const slotId of readSlotIds(item.data)) {
      if (seen.has(slotId)) {
        continue;
      }
      seen.add(slotId);
      counts.set(slotId, (counts.get(slotId) ?? 0) + 1);
    }
  }
  return counts;
}
