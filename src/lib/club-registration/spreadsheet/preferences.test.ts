import { describe, expect, it } from "@jest/globals";
import {
  getDefaultSpreadsheetPreferences,
  getVisibleColumnsInOrder,
  normalizeSpreadsheetPreferences,
  validateSpreadsheetPreferencesPayload,
} from "./preferences";

describe("spreadsheet preferences", () => {
  it("affiche toutes les colonnes par défaut sauf le UID soumettant", () => {
    const prefs = getDefaultSpreadsheetPreferences();
    const visible = getVisibleColumnsInOrder(prefs);
    expect(visible).toContain("lastName");
    expect(visible).toContain("firstName");
    expect(visible).toContain("submitterAccountEmail");
    expect(visible).not.toContain("submitterUid");
    expect(prefs.columns.find((column) => column.id === "submitterUid")?.visible).toBe(false);
  });

  it("normalise une liste partielle en complétant les colonnes manquantes", () => {
    const normalized = normalizeSpreadsheetPreferences({
      columns: [{ id: "lastName", visible: true }],
    });
    expect(getVisibleColumnsInOrder(normalized)).toEqual(["lastName"]);
    expect(normalized.columns.length).toBeGreaterThan(1);
  });

  it("rejette un payload sans colonne visible", () => {
    const result = validateSpreadsheetPreferencesPayload({
      columns: [{ id: "lastName", visible: false }],
    });
    expect(result.ok).toBe(false);
  });
});
