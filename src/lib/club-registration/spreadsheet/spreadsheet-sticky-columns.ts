import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";

export const SPREADSHEET_STICKY_COLUMN_COUNT = 2;

export function splitSpreadsheetVisibleColumns(columnIds: SpreadsheetColumnId[]): {
  pinnedColumnIds: SpreadsheetColumnId[];
  scrollableColumnIds: SpreadsheetColumnId[];
  usePinnedPane: boolean;
} {
  if (columnIds.length <= SPREADSHEET_STICKY_COLUMN_COUNT) {
    return {
      pinnedColumnIds: columnIds,
      scrollableColumnIds: [],
      usePinnedPane: false,
    };
  }

  return {
    pinnedColumnIds: columnIds.slice(0, SPREADSHEET_STICKY_COLUMN_COUNT),
    scrollableColumnIds: columnIds.slice(SPREADSHEET_STICKY_COLUMN_COUNT),
    usePinnedPane: true,
  };
}

export function sumSpreadsheetColumnWidths(
  columnIds: SpreadsheetColumnId[],
  getColumnWidth: (columnId: SpreadsheetColumnId) => number
): number {
  return columnIds.reduce((total, columnId) => total + getColumnWidth(columnId), 0);
}

export function pinnedPaneEdgeSx() {
  return {
    boxShadow: "5px 0 14px -6px rgba(15, 23, 42, 0.16)",
    borderRight: "1px solid",
    borderColor: "divider",
  };
}
