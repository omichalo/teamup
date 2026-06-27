export type SpreadsheetTableDensity = "comfortable" | "compact";

export const SPREADSHEET_TABLE_DENSITY_VALUES: SpreadsheetTableDensity[] = [
  "comfortable",
  "compact",
];

export function resolveSpreadsheetTableDensity(
  value: unknown
): SpreadsheetTableDensity {
  return value === "compact" ? "compact" : "comfortable";
}

export function getSpreadsheetTableDensitySx(density: SpreadsheetTableDensity) {
  if (density === "compact") {
    return {
      headerHeight: 32,
      cellPy: 0.25,
      cellFontSize: "0.72rem",
      chipScale: 0.9,
    };
  }
  return {
    headerHeight: 44,
    cellPy: 1,
    cellFontSize: "0.8125rem",
    chipScale: 1,
  };
}
