"use client";

import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

export type UseVirtualGridWindowArgs = {
  scrollElementRef: RefObject<HTMLDivElement | null>;
  rowCount: number;
  rowHeight: number;
  scrollableColumnCount: number;
  getScrollableColumnWidth: (scrollableIndex: number) => number;
  overscanRows?: number;
  overscanColumns?: number;
};

export type VirtualGridWindow = {
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  columnVirtualizer: Virtualizer<HTMLDivElement, Element>;
};

export function useVirtualGridWindow({
  scrollElementRef,
  rowCount,
  rowHeight,
  scrollableColumnCount,
  getScrollableColumnWidth,
  overscanRows = 8,
  overscanColumns = 3,
}: UseVirtualGridWindowArgs): VirtualGridWindow {
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => rowHeight,
    overscan: overscanRows,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: scrollableColumnCount,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: getScrollableColumnWidth,
    overscan: overscanColumns,
  });

  return { rowVirtualizer, columnVirtualizer };
}
