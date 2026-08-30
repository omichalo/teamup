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
    expect(visible.slice(0, 4)).toEqual([
      "lastName",
      "firstName",
      "ffttLicense",
      "ffttCategorie",
    ]);
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

  it("insère la catégorie FFTT après la licence dans une liste déjà sauvegardée", () => {
    const normalized = normalizeSpreadsheetPreferences({
      columns: [
        { id: "lastName", visible: true },
        { id: "firstName", visible: true },
        { id: "status", visible: true },
        { id: "ffttLicense", visible: true },
        { id: "ffttLicenseLookup", visible: true },
      ],
    });
    const ids = normalized.columns.map((column) => column.id);
    expect(ids.indexOf("ffttCategorie")).toBe(ids.indexOf("ffttLicense") + 1);
    expect(normalized.columns.find((column) => column.id === "ffttCategorie")?.visible).toBe(
      true
    );
  });

  it("ramène la catégorie FFTT à côté de la licence si elle était en fin de liste", () => {
    const normalized = normalizeSpreadsheetPreferences({
      columns: [
        { id: "lastName", visible: true },
        { id: "firstName", visible: true },
        { id: "ffttLicense", visible: true },
        { id: "status", visible: true },
        { id: "ffttCategorie", visible: true },
      ],
    });
    const ids = normalized.columns.map((column) => column.id);
    expect(ids.indexOf("ffttCategorie")).toBe(ids.indexOf("ffttLicense") + 1);
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
