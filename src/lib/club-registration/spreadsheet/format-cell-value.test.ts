import { describe, expect, it } from "@jest/globals";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  formatFfttLicenseLookupForSpreadsheet,
  formatMedicalQuestionnaireForSpreadsheet,
  formatPaymentAidsForSpreadsheet,
  formatPricingQuoteForSpreadsheet,
} from "./format-complex-field-values";
import { formatSpreadsheetCellValue } from "./format-cell-value";

describe("formatSpreadsheetCellValue user labels", () => {
  const row: RegistrationClientRecord = {
    id: "reg_1",
    paymentRequestedBy: "uid-secretary",
    submitterUid: "uid-parent",
    submitterAccountEmail: "parent@example.com",
  };

  const context = {
    userLabels: {
      "uid-secretary": {
        displayName: "Marie Dupont",
        email: "marie@club.fr",
      },
      "uid-parent": {
        displayName: null,
        email: "parent@example.com",
      },
    },
  };

  it("affiche le nom ou l'e-mail à la place des UID utilisateur", () => {
    expect(formatSpreadsheetCellValue("paymentRequestedBy", row, null, context)).toBe(
      "Marie Dupont"
    );
    expect(formatSpreadsheetCellValue("submitterUid", row, null, context)).toBe(
      "parent@example.com"
    );
  });

  it("n'affiche jamais un UID brut pour les champs utilisateur", () => {
    expect(formatSpreadsheetCellValue("medicalCertificateStatusUpdatedBy", row, null, context)).toBe(
      ""
    );
  });

  it("affiche le nom de famille en majuscules", () => {
    expect(
      formatSpreadsheetCellValue("lastName", { id: "r1", lastName: "dupont" }, null)
    ).toBe("DUPONT");
  });
});

describe("formatSpreadsheetCellValue structured fields", () => {
  it("n'affiche jamais de JSON brut pour les champs structurés", () => {
    const row: RegistrationClientRecord = {
      id: "reg_1",
      medicalQuestionnaire: { summary: "all_no", answers: { q1: "no" } },
      ffttLicenseLookup: {
        licence: "123456",
        prenom: "Jean",
        nom: "Dupont",
        nomClub: "SQY Ping",
        pointsLicence: 500,
      },
      pricingQuote: {
        catalogVersion: "sqyping-2025-05",
        segmentLabel: "Adulte",
        lines: [{ id: "m1", kind: "membership", label: "Adhésion", amountCents: 15000, source: "catalog" }],
        subtotalCents: 15000,
        totalCents: 15000,
        warnings: [],
        requiresAdminReview: false,
      },
      paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5000, reference: "ABC123" }],
    };

    for (const columnId of [
      "medicalQuestionnaire",
      "ffttLicenseLookup",
      "pricingQuote",
      "paymentAids",
    ] as const) {
      const display = formatSpreadsheetCellValue(columnId, row, null);
      expect(display).not.toMatch(/^\{/);
      expect(display).not.toMatch(/^\[/);
      expect(display.length).toBeGreaterThan(0);
    }
  });
});

describe("format complex field helpers", () => {
  it("formate le questionnaire médical", () => {
    expect(
      formatMedicalQuestionnaireForSpreadsheet({ summary: "has_yes", answers: { q1: "yes" } })
    ).toContain("Au moins une réponse Oui");
  });

  it("formate la licence FFTT", () => {
    expect(
      formatFfttLicenseLookupForSpreadsheet({
        licence: "99999",
        prenom: "Alice",
        nom: "Martin",
        nomClub: "SQY Ping",
      })
    ).toBe("Licence 99999 — Alice MARTIN — SQY Ping");
  });

  it("formate le devis tarifaire", () => {
    expect(
      formatPricingQuoteForSpreadsheet({
        catalogVersion: "sqyping-2025-05",
        segmentLabel: "Jeune",
        lines: [{ id: "l1", kind: "membership", label: "Adhésion", amountCents: 12000, source: "catalog" }],
        subtotalCents: 12000,
        totalCents: 12000,
        warnings: [],
        requiresAdminReview: false,
      })
    ).toContain("Total : 120,00 €");
  });

  it("formate les aides de paiement", () => {
    expect(
      formatPaymentAidsForSpreadsheet([
        { type: "pass_sport", label: "Pass Sport", amountCents: 5000, reference: "REF1" },
      ])
    ).toContain("Pass Sport");
    expect(
      formatPaymentAidsForSpreadsheet([
        { type: "pass_sport", label: "Pass Sport", amountCents: 5000, reference: "REF1" },
      ])
    ).toContain("REF1");
  });
});
