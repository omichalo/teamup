import { describe, expect, it } from "@jest/globals";
import { buildSpreadsheetCsvContent } from "./export-csv";

describe("spreadsheet export csv", () => {
  it("génère un CSV avec en-têtes et séparateur point-virgule", () => {
    const content = buildSpreadsheetCsvContent(
      [{ id: "abc", lastName: "Dupont", firstName: "Alice" }],
      ["lastName", "firstName"],
      null
    );

    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(content).toContain("Nom;Prénom");
    expect(content).toContain("Dupont;Alice");
  });

  it("échappe les guillemets et retours ligne", () => {
    const content = buildSpreadsheetCsvContent(
      [{ id: "abc", applicantNotes: 'Ligne "spéciale"\nfin' }],
      ["applicantNotes"],
      null
    );

    expect(content).toContain('"Ligne ""spéciale""');
  });
});
