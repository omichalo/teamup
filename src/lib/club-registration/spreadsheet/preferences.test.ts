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
    expect(visible).toContain("criteriumFederalRegistrationStatus");
    expect(visible).toContain("jerseyFollowUpStatus");
    expect(visible).toContain("registrationCertificateFollowUpStatus");
    expect(prefs.columns.find((column) => column.id === "submitterUid")?.visible).toBe(false);
  });

  it("complète une liste partielle sans masquer les colonnes non citées", () => {
    const normalized = normalizeSpreadsheetPreferences({
      columns: [{ id: "lastName", visible: true }],
    });
    const visible = getVisibleColumnsInOrder(normalized);
    expect(visible[0]).toBe("lastName");
    expect(visible).toContain("firstName");
    expect(visible).toContain("registrationCertificateFollowUpStatus");
    expect(normalized.columns.find((column) => column.id === "submitterUid")?.visible).toBe(
      false
    );
    expect(normalized.columns.length).toBeGreaterThan(1);
  });

  it("conserve le masquage explicite d’une colonne", () => {
    const normalized = normalizeSpreadsheetPreferences({
      columns: [
        { id: "lastName", visible: true },
        { id: "registrationCertificateFollowUpStatus", visible: false },
      ],
    });
    expect(getVisibleColumnsInOrder(normalized)).not.toContain(
      "registrationCertificateFollowUpStatus"
    );
  });

  it("rejette un payload sans colonne visible", () => {
    const result = validateSpreadsheetPreferencesPayload({
      columns: [{ id: "lastName", visible: false }],
    });
    expect(result.ok).toBe(false);
  });
});
