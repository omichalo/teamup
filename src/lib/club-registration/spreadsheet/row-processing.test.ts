import { describe, expect, it } from "@jest/globals";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  applySpreadsheetFilters,
  filterSpreadsheetRowsByGlobalSearch,
} from "./row-processing";

function row(partial: Partial<RegistrationClientRecord> & { id: string }): RegistrationClientRecord {
  return partial;
}

describe("spreadsheet row filters", () => {
  const rows: RegistrationClientRecord[] = [
    row({
      id: "1",
      firstName: "Alice",
      lastName: "Martin",
      adherentEmail: "alice@example.com",
      city: "Trappes",
    }),
    row({
      id: "2",
      firstName: "Bob",
      lastName: "Durand",
      adherentEmail: "bob@club.fr",
      city: "Versailles",
    }),
  ];

  it("filtre la recherche globale sur prénom, nom et e-mail uniquement", () => {
    expect(filterSpreadsheetRowsByGlobalSearch(rows, "Trappes")).toHaveLength(0);
    expect(filterSpreadsheetRowsByGlobalSearch(rows, "alice@example")).toEqual([rows[0]]);
    expect(filterSpreadsheetRowsByGlobalSearch(rows, "martin")).toEqual([rows[0]]);
    expect(filterSpreadsheetRowsByGlobalSearch(rows, "bob durand")).toEqual([rows[1]]);
  });

  it("combine recherche globale et filtres par colonne", () => {
    const filtered = applySpreadsheetFilters(rows, {
      globalSearchQuery: "bob",
      columnFilters: { city: "vers" },
      visibleColumnIds: ["city"],
      config: null,
    });
    expect(filtered).toEqual([rows[1]]);
  });
});
