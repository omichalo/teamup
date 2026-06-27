import { describe, expect, it } from "@jest/globals";
import {
  buildSpreadsheetPathWithParams,
  parseSpreadsheetUrlState,
} from "./spreadsheet-url-state";

describe("spreadsheet url state", () => {
  it("parse vue, recherche, tri et dossier", () => {
    const params = new URLSearchParams(
      "vue=to_review&q=Dupont&tri=lastName&ordre=asc&dossier=abc123"
    );
    expect(parseSpreadsheetUrlState(params)).toEqual({
      viewId: "to_review",
      searchQuery: "Dupont",
      sort: { columnId: "lastName", direction: "asc" },
      openRegistrationId: "abc123",
    });
  });

  it("construit un chemin partageable", () => {
    expect(
      buildSpreadsheetPathWithParams({
        viewId: "missing_certificate",
        searchQuery: "Martin",
        sort: { columnId: "submittedAt", direction: "desc" },
        openRegistrationId: "id-1",
      })
    ).toBe(
      "/club/adhesions-tableau?vue=missing_certificate&q=Martin&tri=submittedAt&ordre=desc&dossier=id-1"
    );
  });
});
