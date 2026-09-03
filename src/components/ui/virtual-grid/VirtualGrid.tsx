"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  computeColumnOffsets,
  splitPinnedColumnCount,
  sumColumnWidths,
} from "./column-layout";
import type { VirtualGridProps } from "./types";
import { VirtualGridRow } from "./VirtualGridRow";
import {
  VirtualGridSharedTooltip,
  type VirtualGridTooltipState,
} from "./VirtualGridSharedTooltip";
import { useVirtualGridWindow } from "./useVirtualGridWindow";

function headerCellStyle(width: number, extra?: CSSProperties): CSSProperties {
  return {
    width,
    minWidth: width,
    maxWidth: width,
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    fontWeight: 700,
    borderBottom: "1px solid var(--vg-border, rgba(0, 0, 0, 0.12))",
    borderRight: "1px solid var(--vg-border-muted, rgba(0, 0, 0, 0.08))",
    background: "var(--vg-header-bg, #f5f5f5)",
    ...extra,
  };
}

export function VirtualGrid<T>({
  rows,
  columns,
  getRowId,
  rowHeight,
  headerHeight,
  filterRowHeight = 0,
  pinnedColumnCount = 0,
  overscanRows = 8,
  overscanColumns = 3,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  getRowStyle,
  getRowClassName,
  emptyContent,
  fillAvailableHeight = false,
  maxHeight,
  className,
  style,
  enableSharedTooltip = true,
  scrollContainerRef: externalScrollRef,
}: VirtualGridProps<T>) {
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;
  const [tooltipState, setTooltipState] = useState<VirtualGridTooltipState>(null);

  const { pinnedCount, scrollableCount } = splitPinnedColumnCount(
    columns.length,
    pinnedColumnCount
  );

  const widths = useMemo(() => columns.map((column) => column.width), [columns]);
  const offsets = useMemo(() => computeColumnOffsets(widths), [widths]);
  const totalWidth = useMemo(() => sumColumnWidths(widths), [widths]);
  const pinnedTotalWidth = useMemo(
    () => sumColumnWidths(widths.slice(0, pinnedCount)),
    [widths, pinnedCount]
  );
  const pinnedOffsets = useMemo(() => offsets.slice(0, pinnedCount), [offsets, pinnedCount]);

  const getScrollableColumnWidth = useCallback(
    (scrollableIndex: number) => widths[pinnedCount + scrollableIndex] ?? 0,
    [widths, pinnedCount]
  );

  const { rowVirtualizer, columnVirtualizer } = useVirtualGridWindow({
    scrollElementRef: scrollRef,
    rowCount: rows.length,
    rowHeight,
    scrollableColumnCount: scrollableCount,
    getScrollableColumnWidth,
    overscanRows,
    overscanColumns,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rows.length, rowVirtualizer]);

  useEffect(() => {
    columnVirtualizer.measure();
  }, [widths, scrollableCount, columnVirtualizer]);

  const headerBlockHeight = headerHeight + (filterRowHeight > 0 ? filterRowHeight : 0);
  const bodyHeight = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  const onCellTooltipEnter = useCallback((text: string, anchor: HTMLElement) => {
    setTooltipState({ text, anchor });
  }, []);

  const onCellTooltipLeave = useCallback(() => {
    setTooltipState(null);
  }, []);

  const containerStyle: CSSProperties = {
    position: "relative",
    overflow: "auto",
    width: "100%",
    ...(fillAvailableHeight
      ? { flex: 1, minHeight: 0, maxHeight: "none" }
      : { maxHeight: maxHeight ?? "68vh" }),
    ...style,
  };

  const renderHeaderBand = (kind: "header" | "filter", bandHeight: number, top: number) => {
    if (bandHeight <= 0) {
      return null;
    }
    return (
      <div
        role="row"
        style={{
          position: "sticky",
          top,
          left: 0,
          zIndex: kind === "header" ? 5 : 4,
          height: bandHeight,
          width: totalWidth,
          display: "flex",
          // containing block for absolute virtual header cells
          // sticky already establishes positioning context
        }}
      >
        {columns.slice(0, pinnedCount).map((column, pinnedIndex) => (
          <div
            key={`h-${kind}-${column.id}`}
            role="columnheader"
            style={headerCellStyle(column.width, {
              position: "sticky",
              left: pinnedOffsets[pinnedIndex] ?? 0,
              zIndex: 6,
              height: bandHeight,
              background: kind === "header" ? "var(--vg-header-bg, #f5f5f5)" : "var(--vg-filter-bg, #fafafa)",
            })}
          >
            {kind === "header" ? column.renderHeader() : column.renderFilter?.()}
          </div>
        ))}
        {virtualColumns.map((virtualColumn) => {
          const column = columns[pinnedCount + virtualColumn.index];
          if (!column) {
            return null;
          }
          return (
            <div
              key={`h-${kind}-${column.id}`}
              role="columnheader"
              style={headerCellStyle(column.width, {
                position: "absolute",
                left: pinnedTotalWidth + virtualColumn.start,
                top: 0,
                height: bandHeight,
                zIndex: 5,
                background:
                  kind === "header" ? "var(--vg-header-bg, #f5f5f5)" : "var(--vg-filter-bg, #fafafa)",
              })}
            >
              {kind === "header" ? column.renderHeader() : column.renderFilter?.()}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={scrollRef}
      role="grid"
      className={className}
      style={containerStyle}
      onMouseLeave={() => {
        setTooltipState(null);
        onRowMouseLeave?.();
      }}
    >
      <div style={{ position: "relative", width: totalWidth, height: headerBlockHeight + bodyHeight }}>
        {renderHeaderBand("header", headerHeight, 0)}
        {filterRowHeight > 0 ? renderHeaderBand("filter", filterRowHeight, headerHeight) : null}

        <div
          role="rowgroup"
          style={{
            position: "absolute",
            top: headerBlockHeight,
            left: 0,
            width: totalWidth,
            height: bodyHeight,
          }}
        >
          {rows.length === 0 ? (
            <div style={{ padding: 32, width: "100%" }}>{emptyContent}</div>
          ) : (
            virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) {
                return null;
              }
              const rowStyle = getRowStyle?.(row, virtualRow.index);
              const rowClassName = getRowClassName?.(row, virtualRow.index);
              return (
                <VirtualGridRow
                  key={getRowId(row)}
                  row={row}
                  rowIndex={virtualRow.index}
                  rowId={getRowId(row)}
                  columns={columns}
                  pinnedCount={pinnedCount}
                  pinnedOffsets={pinnedOffsets}
                  pinnedTotalWidth={pinnedTotalWidth}
                  virtualColumns={virtualColumns}
                  scrollableStartIndex={pinnedCount}
                  rowHeight={rowHeight}
                  translateY={virtualRow.start}
                  totalWidth={totalWidth}
                  {...(rowStyle ? { rowStyle } : {})}
                  {...(rowClassName ? { rowClassName } : {})}
                  {...(onRowClick ? { onRowClick } : {})}
                  {...(onRowMouseEnter ? { onRowMouseEnter } : {})}
                  {...(enableSharedTooltip
                    ? {
                        onCellTooltipEnter,
                        onCellTooltipLeave,
                      }
                    : {})}
                />
              );
            })
          )}
        </div>
      </div>
      {enableSharedTooltip ? <VirtualGridSharedTooltip state={tooltipState} /> : null}
    </div>
  );
}
