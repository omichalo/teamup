import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import { SPREADSHEET_COLUMN_LABELS } from "./column-labels";
import type { SpreadsheetColumnId } from "./column-ids";
import {
  EMPTY_SPREADSHEET_FORMAT_CONTEXT,
  type SpreadsheetFormatContext,
} from "./format-context";
import { formatSpreadsheetCellValue } from "./format-cell-value";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildSpreadsheetCsvContent(
  rows: RegistrationClientRecord[],
  visibleColumnIds: SpreadsheetColumnId[],
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext = EMPTY_SPREADSHEET_FORMAT_CONTEXT
): string {
  const header = visibleColumnIds
    .map((columnId) => escapeCsvCell(SPREADSHEET_COLUMN_LABELS[columnId]))
    .join(";");

  const body = rows.map((row) =>
    visibleColumnIds
      .map((columnId) =>
        escapeCsvCell(formatSpreadsheetCellValue(columnId, row, config, context))
      )
      .join(";")
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function downloadSpreadsheetCsv(
  filename: string,
  content: string
): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function buildSpreadsheetExportFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `adhesions-${stamp}.csv`;
}
