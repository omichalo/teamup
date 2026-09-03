/** Largeurs cumulées : offset[i] = somme des largeurs [0..i). */
export function computeColumnOffsets(widths: readonly number[]): number[] {
  const offsets: number[] = new Array(widths.length);
  let total = 0;
  for (let i = 0; i < widths.length; i += 1) {
    offsets[i] = total;
    total += Math.max(0, widths[i] ?? 0);
  }
  return offsets;
}

export function sumColumnWidths(widths: readonly number[]): number {
  let total = 0;
  for (const width of widths) {
    total += Math.max(0, width);
  }
  return total;
}

export function splitPinnedColumnCount(
  columnCount: number,
  pinnedColumnCount: number
): { pinnedCount: number; scrollableCount: number } {
  const pinned = Math.max(0, Math.min(Math.floor(pinnedColumnCount), columnCount));
  return {
    pinnedCount: pinned,
    scrollableCount: Math.max(0, columnCount - pinned),
  };
}

/** Offset left sticky pour la i-ème colonne épinglée. */
export function stickyLeftForPinnedIndex(
  pinnedOffsets: readonly number[],
  pinnedIndex: number
): number {
  return pinnedOffsets[pinnedIndex] ?? 0;
}
