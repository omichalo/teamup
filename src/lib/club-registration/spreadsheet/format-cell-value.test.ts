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

  it("affiche la catégorie FFTT dérivée", () => {
    expect(
      formatSpreadsheetCellValue(
        "ffttCategorie",
        { id: "r1", ffttCategorie: "Sénior" },
        null
      )
    ).toBe("Sénior");
  });

  it("affiche le suivi d’inscription au Critérium fédéral", () => {
    expect(
      formatSpreadsheetCellValue(
        "criteriumFederalRegistrationStatus",
        { id: "r1", criteriumFederalRegistrationStatus: "to_do" },
        null
      )
    ).toBe("À faire");
    expect(
      formatSpreadsheetCellValue(
        "criteriumFederalRegistrationStatus",
        { id: "r2", criteriumFederalRegistrationStatus: "validated" },
        null
      )
    ).toBe("Validé");
    expect(
      formatSpreadsheetCellValue(
        "criteriumFederalRegistrationStatus",
        { id: "r3", criteriumFederalRegistrationStatus: "not_applicable" },
        null
      )
    ).toBe("Non applicable");
  });

  it("affiche le suivi de remise du maillot", () => {
    expect(
      formatSpreadsheetCellValue(
        "jerseyFollowUpStatus",
        { id: "r1", jerseyFollowUpStatus: "to_do" },
        null
      )
    ).toBe("À faire");
    expect(
      formatSpreadsheetCellValue(
        "jerseyFollowUpStatus",
        { id: "r2", jerseyFollowUpStatus: "given" },
        null
      )
    ).toBe("Donné");
    expect(
      formatSpreadsheetCellValue(
        "jerseyFollowUpStatus",
        { id: "r4", jerseyFollowUpStatus: "prepared_awaiting_payment" },
        null
      )
    ).toBe("Préparé - attente paiement");
    expect(
      formatSpreadsheetCellValue(
        "jerseyFollowUpStatus",
        { id: "r3", jerseyFollowUpStatus: "not_applicable" },
        null
      )
    ).toBe("Non applicable");
  });

  it("affiche le suivi d’envoi de l’attestation d’inscription", () => {
    expect(
      formatSpreadsheetCellValue(
        "registrationCertificateFollowUpStatus",
        { id: "r1", registrationCertificateFollowUpStatus: "to_do" },
        null
      )
    ).toBe("À faire");
    expect(
      formatSpreadsheetCellValue(
        "registrationCertificateFollowUpStatus",
        { id: "r2", registrationCertificateFollowUpStatus: "sent" },
        null
      )
    ).toBe("Envoyée");
    expect(
      formatSpreadsheetCellValue(
        "registrationCertificateFollowUpStatus",
        { id: "r3", registrationCertificateFollowUpStatus: "not_applicable" },
        null
      )
    ).toBe("Non applicable");
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
    ).toContain("Au moins une réponse « Oui »");
  });

  it("formate la licence", () => {
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
    ).toContain("en attente");
    expect(
      formatPaymentAidsForSpreadsheet([
        {
          type: "pass_sport",
          label: "Pass Sport",
          amountCents: 5000,
          received: true,
        },
      ])
    ).toContain("reçue");
    expect(
      formatPaymentAidsForSpreadsheet([
        { type: "other", label: "Remise exceptionnelle", amountCents: 1000, note: "Geste" },
      ])
    ).not.toContain("en attente");
  });
});
