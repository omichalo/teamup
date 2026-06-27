import { describe, expect, it } from "@jest/globals";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  computeSpreadsheetSummaryStats,
  filterSpreadsheetRowsByQuickFilters,
  getSpreadsheetSavedView,
  quickFiltersMatchSavedView,
  resolveActiveSavedViewId,
} from "./quick-filters";

describe("spreadsheet quick filters", () => {
  const rows: RegistrationClientRecord[] = [
    {
      id: "a",
      status: "submitted",
      paymentStatus: "waiting_payment",
      medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
      medicalCertificateStatus: "required_not_received",
    },
    {
      id: "b",
      status: "approved",
      paymentStatus: "paid",
      medicalCertificateStatus: "validated",
    },
  ];

  it("filtre les dossiers à valider", () => {
    const view = getSpreadsheetSavedView("to_review");
    const filtered = filterSpreadsheetRowsByQuickFilters(rows, view.quickFilters);
    expect(filtered.map((row) => row.id)).toEqual(["a"]);
  });

  it("calcule la synthèse sur les lignes affichées", () => {
    const stats = computeSpreadsheetSummaryStats(rows);
    expect(stats.displayedCount).toBe(2);
    expect(stats.actionableCount).toBe(1);
    expect(stats.missingCertificateCount).toBe(1);
    expect(stats.paymentPendingCount).toBe(1);
  });

  it("résout la vue active depuis les filtres rapides", () => {
    const view = getSpreadsheetSavedView("missing_certificate");
    expect(resolveActiveSavedViewId(view.quickFilters)).toBe("missing_certificate");
    expect(quickFiltersMatchSavedView(view.quickFilters, "missing_certificate")).toBe(true);
  });
});
