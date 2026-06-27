import {
  pinnedPaneEdgeSx,
  SPREADSHEET_STICKY_COLUMN_COUNT,
  splitSpreadsheetVisibleColumns,
  sumSpreadsheetColumnWidths,
} from "./spreadsheet-sticky-columns";

describe("spreadsheet-sticky-columns", () => {
  const columnIds = ["lastName", "firstName", "status", "city"] as const;
  const getColumnWidth = (columnId: (typeof columnIds)[number]) =>
    columnId === "lastName" ? 120 : columnId === "firstName" ? 100 : 80;

  it("splits visible columns into pinned and scrollable panes", () => {
    expect(splitSpreadsheetVisibleColumns([...columnIds])).toEqual({
      pinnedColumnIds: ["lastName", "firstName"],
      scrollableColumnIds: ["status", "city"],
      usePinnedPane: true,
    });
  });

  it("skips pinned pane when two columns or fewer are visible", () => {
    expect(splitSpreadsheetVisibleColumns(["lastName", "firstName"])).toEqual({
      pinnedColumnIds: ["lastName", "firstName"],
      scrollableColumnIds: [],
      usePinnedPane: false,
    });
  });

  it("sums column widths", () => {
    expect(sumSpreadsheetColumnWidths(["lastName", "firstName"], getColumnWidth)).toBe(220);
  });

  it("styles the pinned pane edge", () => {
    expect(pinnedPaneEdgeSx().borderRight).toBe("1px solid");
  });

  it("pins the first two visible columns only", () => {
    expect(SPREADSHEET_STICKY_COLUMN_COUNT).toBe(2);
  });
});
