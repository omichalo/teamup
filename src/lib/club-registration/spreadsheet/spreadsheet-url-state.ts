import { isSpreadsheetColumnId } from "./column-ids";
import { isSpreadsheetSavedViewId, type SpreadsheetSavedViewId } from "./quick-filters";
import type { SpreadsheetSort } from "./row-processing";

export type SpreadsheetUrlState = {
  viewId: SpreadsheetSavedViewId | null;
  searchQuery: string;
  sort: SpreadsheetSort;
  openRegistrationId: string | null;
};

export function parseSpreadsheetUrlState(
  params: Pick<URLSearchParams, "get">
): Partial<SpreadsheetUrlState> {
  const state: Partial<SpreadsheetUrlState> = {};

  const view = params.get("vue");
  if (view && isSpreadsheetSavedViewId(view)) {
    state.viewId = view;
  }

  const q = params.get("q");
  if (q) {
    state.searchQuery = q;
  }

  const sortColumn = params.get("tri");
  const sortDirection = params.get("ordre");
  if (sortColumn && isSpreadsheetColumnId(sortColumn)) {
    state.sort = {
      columnId: sortColumn,
      direction: sortDirection === "asc" ? "asc" : "desc",
    };
  }

  const dossier = params.get("dossier");
  if (dossier?.trim()) {
    state.openRegistrationId = dossier.trim();
  }

  return state;
}

export function buildSpreadsheetUrlSearchParams(input: {
  viewId?: SpreadsheetSavedViewId | null;
  searchQuery?: string;
  sort?: SpreadsheetSort;
  openRegistrationId?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();

  if (input.viewId && input.viewId !== "all") {
    params.set("vue", input.viewId);
  }
  if (input.searchQuery?.trim()) {
    params.set("q", input.searchQuery.trim());
  }
  if (input.sort?.columnId) {
    params.set("tri", input.sort.columnId);
    params.set("ordre", input.sort.direction);
  }
  if (input.openRegistrationId?.trim()) {
    params.set("dossier", input.openRegistrationId.trim());
  }

  return params;
}

export function buildSpreadsheetPathWithParams(input: {
  viewId?: SpreadsheetSavedViewId | null;
  searchQuery?: string;
  sort?: SpreadsheetSort;
  openRegistrationId?: string | null;
}): string {
  const params = buildSpreadsheetUrlSearchParams(input);
  const query = params.toString();
  return query ? `/club/adhesions-tableau?${query}` : "/club/adhesions-tableau";
}
