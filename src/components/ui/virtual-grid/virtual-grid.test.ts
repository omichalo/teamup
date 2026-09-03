import {
  computeColumnOffsets,
  splitPinnedColumnCount,
  stickyLeftForPinnedIndex,
  sumColumnWidths,
} from "./column-layout";
import { scrollableCellLeft } from "./VirtualGridRow";

describe("virtual-grid column-layout", () => {
  it("computeColumnOffsets cumule les largeurs", () => {
    expect(computeColumnOffsets([100, 50, 200])).toEqual([0, 100, 150]);
  });

  it("sumColumnWidths ignore les négatifs en les bornant à 0", () => {
    expect(sumColumnWidths([10, -5, 20])).toBe(30);
  });

  it("splitPinnedColumnCount borne le pin", () => {
    expect(splitPinnedColumnCount(5, 2)).toEqual({ pinnedCount: 2, scrollableCount: 3 });
    expect(splitPinnedColumnCount(2, 5)).toEqual({ pinnedCount: 2, scrollableCount: 0 });
    expect(splitPinnedColumnCount(4, 0)).toEqual({ pinnedCount: 0, scrollableCount: 4 });
  });

  it("stickyLeftForPinnedIndex lit les offsets", () => {
    const offsets = computeColumnOffsets([80, 120, 40]);
    expect(stickyLeftForPinnedIndex(offsets, 0)).toBe(0);
    expect(stickyLeftForPinnedIndex(offsets, 1)).toBe(80);
  });
});

describe("scrollableCellLeft", () => {
  it("place la cellule après le bloc pinned", () => {
    expect(scrollableCellLeft(200, 40)).toBe(240);
  });
});
