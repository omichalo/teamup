/** @jest-environment node */

import {
  isInvoiceDocumentAvailable,
  isReceiptDocumentAvailable,
  resolvePaymentDocumentsAvailability,
} from "./availability";
import { buildPaymentInvoicePdf } from "./build-invoice-pdf";
import { buildPaymentInvoiceViewModel } from "./build-invoice-view-model";
import {
  buildPaymentReceiptPdf,
  sanitizeReceiptPaymentDetail,
} from "./build-receipt-pdf";
import { buildPaymentReceiptViewModel } from "./build-receipt-view-model";

describe("payment documents availability", () => {
  it("expose un reçu dès qu'un encaissement actif existe (partiel)", () => {
    const data = {
      status: "payment_requested",
      paymentStatus: "partially_paid",
      payment: {
        paymentMethod: "cheque",
        totalAmountCents: 20_000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 20_000,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "p1",
            method: "cheque",
            label: "Chèque 1/2",
            amountCents: 10_000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
        paidAmountCents: 10_000,
        remainingAmountCents: 10_000,
        paymentStatus: "partially_paid",
      },
    };

    expect(isReceiptDocumentAvailable(data)).toBe(true);
    expect(isInvoiceDocumentAvailable(data)).toBe(true);
    expect(resolvePaymentDocumentsAvailability(data)).toEqual({
      invoiceAvailable: true,
      receiptAvailable: true,
    });
  });

  it("expose facture et reçu pour un dossier soldé avec stripeInvoiceId", () => {
    const data = {
      status: "paid",
      paymentStatus: "paid",
      paidAt: "2026-09-01T10:00:00.000Z",
      stripeInvoiceId: "in_123",
      payment: {
        paymentMethod: "card",
        totalAmountCents: 20_000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 20_000,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "p1",
            method: "card",
            label: "Paiement Stripe",
            amountCents: 20_000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
        paidAmountCents: 20_000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      },
    };

    expect(resolvePaymentDocumentsAvailability(data)).toEqual({
      invoiceAvailable: true,
      receiptAvailable: true,
    });
  });

  it("expose la facture dès paiement demandé, sans encaissement", () => {
    const data = {
      status: "payment_requested",
      paymentStatus: "waiting_payment",
      pricingQuote: {
        catalogVersion: "v1",
        segmentLabel: "Adulte",
        subtotalCents: 20_000,
        totalCents: 20_000,
        warnings: [],
        requiresAdminReview: false,
        lines: [
          {
            id: "membership",
            kind: "membership",
            label: "Adhésion club",
            amountCents: 20_000,
            source: "catalog",
          },
        ],
      },
      payment: {
        paymentMethod: "cheque",
        totalAmountCents: 20_000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 20_000,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [],
        paidAmountCents: 0,
        remainingAmountCents: 20_000,
        paymentStatus: "waiting_payment",
      },
    };

    expect(resolvePaymentDocumentsAvailability(data)).toEqual({
      invoiceAvailable: true,
      receiptAvailable: false,
    });
  });
});

describe("buildPaymentReceiptViewModel", () => {
  it("détaille les lignes devis et les encaissements partiels", () => {
    const vm = buildPaymentReceiptViewModel(
      "reg_1",
      {
        firstName: "Ada",
        lastName: "Lovelace",
        seasonLabel: "2026-2027",
        pricingQuote: {
          catalogVersion: "v1",
          segmentLabel: "Adulte",
          subtotalCents: 20_000,
          totalCents: 20_000,
          warnings: [],
          requiresAdminReview: false,
          lines: [
            {
              id: "membership",
              kind: "membership",
              label: "Adhésion club",
              amountCents: 16_000,
              source: "catalog",
            },
            {
              id: "fftt_license",
              kind: "fftt_license",
              label: "Licence FFTT",
              amountCents: 4_000,
              source: "catalog",
            },
          ],
        },
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentInstallments: 2,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "p1",
              method: "cheque",
              label: "Chèque 1/2",
              amountCents: 10_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
              reference: "123456",
            },
          ],
          paidAmountCents: 10_000,
          remainingAmountCents: 10_000,
          paymentStatus: "partially_paid",
        },
      },
      { documentNumber: "REC-2026-2027-00001", now: new Date("2026-09-28T12:00:00.000Z") }
    );

    expect(vm).not.toBeNull();
    expect(vm?.documentNumber).toBe("REC-2026-2027-00001");
    expect(vm?.settlementLabel).toBe("Partiellement payé");
    expect(vm?.quoteLines).toHaveLength(2);
    expect(vm?.paidTotalCents).toBe(10_000);
    expect(vm?.remainingCents).toBe(10_000);
    expect(vm?.payments[0]?.reference).toBe("123456");
  });

  it("retourne null sans encaissement ni statut payé", () => {
    expect(
      buildPaymentReceiptViewModel(
        "reg_1",
        {
          status: "submitted",
          payment: {
            paymentMethod: "card",
            totalAmountCents: 20_000,
            assistanceTotalAmountCents: 0,
            amountToPayCents: 20_000,
            aids: [],
            paymentInstallments: 1,
            expectedPayments: [],
            receivedPayments: [],
            paidAmountCents: 0,
            remainingAmountCents: 20_000,
            paymentStatus: "waiting_payment",
          },
        },
        { documentNumber: "REC-2026-2027-00099" }
      )
    ).toBeNull();
  });

  it("génère un PDF non vide", async () => {
    const vm = buildPaymentReceiptViewModel(
      "reg_pdf",
      {
        firstName: "Ada",
        lastName: "Lovelace",
        seasonLabel: "2026-2027",
        status: "paid",
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 10_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 10_000,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "p1",
              method: "cheque",
              label: "Chèque 1/1",
              amountCents: 10_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
              reference: "999",
            },
          ],
          paidAmountCents: 10_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
      { documentNumber: "REC-2026-2027-00002", now: new Date("2026-09-28T12:00:00.000Z") }
    );
    expect(vm).not.toBeNull();
    const pdf = await buildPaymentReceiptPdf(vm!);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});

describe("buildPaymentInvoiceViewModel", () => {
  it("construit une facture depuis le devis même en paiement partiel", () => {
    const vm = buildPaymentInvoiceViewModel(
      "reg_inv",
      {
        firstName: "Ada",
        lastName: "Lovelace",
        seasonLabel: "2026-2027",
        paymentStatus: "partially_paid",
        pricingQuote: {
          catalogVersion: "v1",
          segmentLabel: "Adulte",
          subtotalCents: 20_000,
          totalCents: 20_000,
          warnings: [],
          requiresAdminReview: false,
          lines: [
            {
              id: "membership",
              kind: "membership",
              label: "Adhésion club",
              amountCents: 16_000,
              source: "catalog",
            },
            {
              id: "fftt_license",
              kind: "fftt_license",
              label: "Licence FFTT",
              amountCents: 4_000,
              source: "catalog",
            },
          ],
        },
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentInstallments: 2,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "p1",
              method: "cheque",
              label: "Chèque 1/2",
              amountCents: 10_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 10_000,
          remainingAmountCents: 10_000,
          paymentStatus: "partially_paid",
        },
      },
      { documentNumber: "FAC-2026-2027-00001" }
    );

    expect(vm?.documentNumber).toBe("FAC-2026-2027-00001");
    expect(vm?.quoteLines).toHaveLength(2);
    expect(vm?.invoicedTotalCents).toBe(20_000);
    expect(isInvoiceDocumentAvailable({
      paymentStatus: "partially_paid",
      pricingQuote: {
        catalogVersion: "v1",
        segmentLabel: "Adulte",
        subtotalCents: 20_000,
        totalCents: 20_000,
        warnings: [],
        requiresAdminReview: false,
        lines: [
          {
            id: "membership",
            kind: "membership",
            label: "Adhésion club",
            amountCents: 16_000,
            source: "catalog",
          },
        ],
      },
      payment: {
        paymentMethod: "cheque",
        totalAmountCents: 20_000,
        assistanceTotalAmountCents: 0,
        amountToPayCents: 20_000,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "p1",
            method: "cheque",
            label: "Chèque 1/2",
            amountCents: 10_000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
        paidAmountCents: 10_000,
        remainingAmountCents: 10_000,
        paymentStatus: "partially_paid",
      },
    })).toBe(true);
  });

  it("génère un PDF facture non vide", async () => {
    const vm = buildPaymentInvoiceViewModel(
      "reg_inv_pdf",
      {
        firstName: "Ada",
        lastName: "Lovelace",
        status: "paid",
        paymentAmountCents: 12_000,
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 12_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 12_000,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "p1",
              method: "cheque",
              label: "Chèque",
              amountCents: 12_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 12_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
      { documentNumber: "FAC-2026-2027-00003" }
    );
    expect(vm).not.toBeNull();
    const pdf = await buildPaymentInvoicePdf(vm!);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});

describe("sanitizeReceiptPaymentDetail", () => {
  it("masque les identifiants Checkout Stripe", () => {
    expect(
      sanitizeReceiptPaymentDetail({
        id: "p1",
        label: "Paiement Stripe",
        method: "card",
        methodLabel: "Carte bancaire",
        amountCents: 100,
        receivedAt: "2026-09-01T10:00:00.000Z",
        receivedAtLabel: "1 septembre 2026",
        note: "Checkout cs_test_b1URoLJbNRcPRCGVM8MujQ25ob8zHALzED6ZDRPD4N83j4GonQIUAX3wvd",
      })
    ).toBe("1 septembre 2026 — Carte bancaire — Paiement Stripe — Paiement en ligne");
  });
});

