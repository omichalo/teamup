import { assignPaymentDocumentNumbersIfEligible } from "./assign-document-numbers";

describe("assignPaymentDocumentNumbersIfEligible", () => {
  it("n'attribue rien si non éligible", async () => {
    const result = await assignPaymentDocumentNumbersIfEligible({
      db: {} as never,
      registrationId: "reg-1",
      data: { status: "submitted" },
    });
    expect(result.assignedInvoice).toBe(false);
    expect(result.assignedReceiptCount).toBe(0);
    expect(result.assignedAidCount).toBe(0);
    expect(result.invoiceNumber).toBeNull();
    expect(result.receiptNumbers).toEqual([]);
    expect(result.aidNumbers).toEqual([]);
  });

  it("réutilise la facture déjà persistée sans réécrire", async () => {
    const result = await assignPaymentDocumentNumbersIfEligible({
      db: {} as never,
      registrationId: "reg-1",
      data: {
        status: "paid",
        paymentStatus: "paid",
        teamupInvoiceNumber: "FAC-2026-2027-00009",
        sageAuxiliaryCode: "A000001",
        accountingInvoices: [
          {
            id: "inv-1",
            kind: "invoice",
            documentNumber: "FAC-2026-2027-00009",
            label: "Facture d'adhésion",
            lines: [{ label: "Cotisation", amountCents: 1000 }],
            totalCents: 1000,
            issuedAt: "2026-09-01T10:00:00.000Z",
            quoteTotalAfterCents: 1000,
          },
        ],
        pricingQuote: {
          catalogVersion: "v1",
          totalCents: 1000,
          lines: [{ kind: "membership", label: "Cotisation", amountCents: 1000 }],
        },
        payment: {
          totalAmountCents: 1000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 1000,
          aids: [],
          paymentMethod: "cheque",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "r1",
              method: "cash",
              label: "Espèces",
              amountCents: 1000,
              receivedAt: "2026-09-01T10:00:00.000Z",
              documentNumber: "REC-2026-2027-00009",
            },
          ],
          paidAmountCents: 1000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
    });

    expect(result.assignedInvoice).toBe(false);
    expect(result.assignedReceiptCount).toBe(0);
    expect(result.assignedAidCount).toBe(0);
    expect(result.invoiceNumber).toBe("FAC-2026-2027-00009");
    expect(result.receiptNumbers).toEqual(["REC-2026-2027-00009"]);
  });
});
