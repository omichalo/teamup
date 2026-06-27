import { buildSpreadsheetRowPreviewLines } from "./spreadsheet-row-preview";

describe("buildSpreadsheetRowPreviewLines", () => {
  it("builds preview fields from a registration row", () => {
    const lines = buildSpreadsheetRowPreviewLines(
      {
        id: "reg-1",
        status: "in_review",
        mainSectionId: "section-adult",
        paymentAmountCents: 22_400,
        paymentStatus: "waiting_payment",
        medicalCertificateStatus: "required_not_received",
        submittedAt: "2026-06-26T21:21:13.000Z",
      },
      null,
      { usersByUid: {}, usersByEmail: {} }
    );

    expect(lines).toEqual([
      { label: "Statut", value: "En relecture" },
      { label: "Section", value: "section-adult" },
      { label: "Montant", value: "224,00 € · En attente de paiement" },
      { label: "Certificat", value: "Requis - non reçu" },
      { label: "Envoyé le", value: expect.any(String) },
    ]);
  });
});
