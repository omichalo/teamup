import type { SpreadsheetColumnId } from "./column-ids";
import type { SpreadsheetUserLabelDirectory } from "./user-labels";

export type SpreadsheetFormatContext = {
  userLabels: SpreadsheetUserLabelDirectory;
};

export const EMPTY_SPREADSHEET_FORMAT_CONTEXT: SpreadsheetFormatContext = {
  userLabels: {},
};

export function resolveSpreadsheetUserLabel(
  uid: unknown,
  context: SpreadsheetFormatContext,
  fallbackEmail?: unknown
): string {
  if (typeof uid !== "string" || uid.trim().length === 0) {
    return "";
  }
  const label = context.userLabels[uid];
  if (label?.displayName?.trim()) {
    return label.displayName.trim();
  }
  if (label?.email?.trim()) {
    return label.email.trim();
  }
  if (typeof fallbackEmail === "string" && fallbackEmail.trim().length > 0) {
    return fallbackEmail.trim();
  }
  return "";
}

export const DEFAULT_SPREADSHEET_COLUMN_WIDTH = 168;
export const MIN_SPREADSHEET_COLUMN_WIDTH = 80;
export const MAX_SPREADSHEET_COLUMN_WIDTH = 520;

export type SpreadsheetColumnWidths = Partial<Record<SpreadsheetColumnId, number>>;

export function normalizeSpreadsheetColumnWidths(raw: unknown): SpreadsheetColumnWidths {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const widths: SpreadsheetColumnWidths = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    widths[key as SpreadsheetColumnId] = Math.min(
      MAX_SPREADSHEET_COLUMN_WIDTH,
      Math.max(MIN_SPREADSHEET_COLUMN_WIDTH, Math.round(value))
    );
  }
  return widths;
}

export function getSpreadsheetColumnWidth(
  columnId: SpreadsheetColumnId,
  columnWidths: SpreadsheetColumnWidths
): number {
  return columnWidths[columnId] ?? DEFAULT_SPREADSHEET_COLUMN_WIDTH;
}
