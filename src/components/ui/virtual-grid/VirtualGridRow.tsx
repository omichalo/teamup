"use client";

import {
  memo,
  useCallback,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { VirtualItem } from "@tanstack/react-virtual";
import type { VirtualGridColumn } from "./types";

export type VirtualGridRowProps<T> = {
  row: T;
  rowIndex: number;
  rowId: string;
  columns: VirtualGridColumn<T>[];
  pinnedCount: number;
  pinnedOffsets: readonly number[];
  pinnedTotalWidth: number;
  virtualColumns: VirtualItem[];
  scrollableStartIndex: number;
  rowHeight: number;
  translateY: number;
  totalWidth: number;
  rowStyle?: CSSProperties;
  rowClassName?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  onRowMouseEnter?: (row: T, rowIndex: number, anchor: HTMLElement) => void;
  onCellTooltipEnter?: (text: string, anchor: HTMLElement) => void;
  onCellTooltipLeave?: () => void;
};

export function scrollableCellLeft(pinnedTotalWidth: number, virtualStart: number): number {
  return pinnedTotalWidth + virtualStart;
}

function cellBaseStyle(width: number, extra?: CSSProperties): CSSProperties {
  return {
    width,
    minWidth: width,
    maxWidth: width,
    boxSizing: "border-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    borderBottom: "1px solid var(--vg-border, rgba(0, 0, 0, 0.12))",
    borderRight: "1px solid var(--vg-border-muted, rgba(0, 0, 0, 0.08))",
    ...extra,
  };
}

function VirtualGridRowInner<T>({
  row,
  rowIndex,
  rowId,
  columns,
  pinnedCount,
  pinnedOffsets,
  pinnedTotalWidth,
  virtualColumns,
  scrollableStartIndex,
  rowHeight,
  translateY,
  totalWidth,
  rowStyle,
  rowClassName,
  onRowClick,
  onRowMouseEnter,
  onCellTooltipEnter,
  onCellTooltipLeave,
}: VirtualGridRowProps<T>) {
  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onRowMouseEnter?.(row, rowIndex, event.currentTarget);
    },
    [onRowMouseEnter, row, rowIndex]
  );

  const renderCell = (
    column: VirtualGridColumn<T>,
    style: CSSProperties,
    key: string
  ): ReactNode => {
    const tooltip = column.getTooltip?.(row, rowIndex);
    return (
      <div
        key={key}
        role="gridcell"
        style={style}
        onMouseEnter={
          tooltip && onCellTooltipEnter
            ? (event) => onCellTooltipEnter(tooltip, event.currentTarget)
            : undefined
        }
        onMouseLeave={tooltip ? onCellTooltipLeave : undefined}
      >
        {column.renderCell(row, rowIndex)}
      </div>
    );
  };

  return (
    <div
      role="row"
      data-row-id={rowId}
      className={rowClassName}
      onClick={() => onRowClick?.(row, rowIndex)}
      onMouseEnter={handleMouseEnter}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: rowHeight,
        width: totalWidth,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        cursor: onRowClick ? "pointer" : undefined,
        ...rowStyle,
      }}
    >
      {columns.slice(0, pinnedCount).map((column, pinnedIndex) =>
        renderCell(
          column,
          cellBaseStyle(column.width, {
            position: "sticky",
            left: pinnedOffsets[pinnedIndex] ?? 0,
            zIndex: 2,
            background: "inherit",
          }),
          `${rowId}-${column.id}`
        )
      )}
      {virtualColumns.map((virtualColumn) => {
        const column = columns[scrollableStartIndex + virtualColumn.index];
        if (!column) {
          return null;
        }
        return renderCell(
          column,
          cellBaseStyle(column.width, {
            position: "absolute",
            top: 0,
            left: scrollableCellLeft(pinnedTotalWidth, virtualColumn.start),
            height: "100%",
          }),
          `${rowId}-${column.id}`
        );
      })}
    </div>
  );
}

export const VirtualGridRow = memo(VirtualGridRowInner) as typeof VirtualGridRowInner;
