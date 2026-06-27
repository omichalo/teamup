import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import {
  EMPTY_SPREADSHEET_QUICK_FILTERS,
  filterSpreadsheetRowsByQuickFilters,
  type SpreadsheetQuickFilters,
} from "@/lib/club-registration/spreadsheet/quick-filters";
import {
  formatSpreadsheetCellValue,
  getSpreadsheetSortValue,
} from "@/lib/club-registration/spreadsheet/format-cell-value";
import {
  EMPTY_SPREADSHEET_FORMAT_CONTEXT,
  type SpreadsheetFormatContext,
} from "@/lib/club-registration/spreadsheet/format-context";

export type SpreadsheetSort = {
  columnId: SpreadsheetColumnId;
  direction: "asc" | "desc";
} | null;

export type SpreadsheetColumnFilters = Partial<Record<SpreadsheetColumnId, string>>;

const GLOBAL_SEARCH_FIELDS: SpreadsheetColumnId[] = [
  "firstName",
  "lastName",
  "adherentEmail",
];

export function filterSpreadsheetRowsByGlobalSearch(
  rows: RegistrationClientRecord[],
  query: string
): RegistrationClientRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    const haystack = GLOBAL_SEARCH_FIELDS.map((field) => {
      const value = row[field];
      return typeof value === "string" ? value : "";
    })
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function filterSpreadsheetRowsByColumnFilters(
  rows: RegistrationClientRecord[],
  columnFilters: SpreadsheetColumnFilters,
  visibleColumnIds: SpreadsheetColumnId[],
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext = EMPTY_SPREADSHEET_FORMAT_CONTEXT
): RegistrationClientRecord[] {
  const activeFilters = visibleColumnIds
    .map((columnId) => ({
      columnId,
      query: columnFilters[columnId]?.trim().toLowerCase() ?? "",
    }))
    .filter((entry) => entry.query.length > 0);

  if (activeFilters.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    activeFilters.every((filter) => {
      const cellValue = formatSpreadsheetCellValue(filter.columnId, row, config, context).toLowerCase();
      return cellValue.includes(filter.query);
    })
  );
}

export function hasActiveQuickFilters(quickFilters: SpreadsheetQuickFilters): boolean {
  return (
    quickFilters.registrationStatuses.length > 0 ||
    quickFilters.paymentStatuses.length > 0 ||
    quickFilters.medicalCertificateStatuses.length > 0
  );
}

export function applySpreadsheetFilters(
  rows: RegistrationClientRecord[],
  options: {
    globalSearchQuery: string;
    columnFilters: SpreadsheetColumnFilters;
    visibleColumnIds: SpreadsheetColumnId[];
    config: RegistrationConfigV1 | null;
    context?: SpreadsheetFormatContext;
    quickFilters?: SpreadsheetQuickFilters;
  }
): RegistrationClientRecord[] {
  const context = options.context ?? EMPTY_SPREADSHEET_FORMAT_CONTEXT;
  const quickFilters = options.quickFilters ?? EMPTY_SPREADSHEET_QUICK_FILTERS;
  const afterQuick = filterSpreadsheetRowsByQuickFilters(rows, quickFilters);
  const afterGlobal = filterSpreadsheetRowsByGlobalSearch(afterQuick, options.globalSearchQuery);
  return filterSpreadsheetRowsByColumnFilters(
    afterGlobal,
    options.columnFilters,
    options.visibleColumnIds,
    options.config,
    context
  );
}

export function hasActiveColumnFilters(columnFilters: SpreadsheetColumnFilters): boolean {
  return Object.values(columnFilters).some((value) => (value?.trim().length ?? 0) > 0);
}

export function hasActiveSpreadsheetFilters(
  globalSearchQuery: string,
  columnFilters: SpreadsheetColumnFilters,
  quickFilters: SpreadsheetQuickFilters = EMPTY_SPREADSHEET_QUICK_FILTERS
): boolean {
  return (
    globalSearchQuery.trim().length > 0 ||
    hasActiveColumnFilters(columnFilters) ||
    hasActiveQuickFilters(quickFilters)
  );
}

export function sortSpreadsheetRows(
  rows: RegistrationClientRecord[],
  sort: SpreadsheetSort,
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext = EMPTY_SPREADSHEET_FORMAT_CONTEXT
): RegistrationClientRecord[] {
  if (!sort) {
    return rows;
  }

  const sorted = [...rows];
  sorted.sort((left, right) => {
    const leftValue = getSpreadsheetSortValue(sort.columnId, left, config, context);
    const rightValue = getSpreadsheetSortValue(sort.columnId, right, config, context);
    const cmp = leftValue.localeCompare(rightValue, "fr", { sensitivity: "base" });
    return sort.direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}
