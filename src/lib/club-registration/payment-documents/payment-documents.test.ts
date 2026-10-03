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
import { buildUnitPaymentReceiptViewModel } from "./build-receipt-view-model";
import { buildPaymentSituationPdf } from "./build-situation-pdf";
import { buildPaymentSituationViewModel } from "./build-situation-view-model";

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
      situationAvailable: true,
      receipts: [
        {
          id: "p1",
          documentNumber: null,
          amountCents: 10_000,
          receivedAt: "2026-09-01T10:00:00.000Z",
          method: "cheque",
          label: "Chèque 1/2",
        },
      ],
      invoices: [],
      aidReceipts: [],
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
            documentNumber: "REC-2026-2027-00001",
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
      situationAvailable: true,
      receipts: [
        {
          id: "p1",
          documentNumber: "REC-2026-2027-00001",
          amountCents: 20_000,
          receivedAt: "2026-09-01T10:00:00.000Z",
          method: "card",
          label: "Paiement Stripe",
        },
      ],
      invoices: [],
      aidReceipts: [],
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
      situationAvailable: true,
      receipts: [],
      invoices: [],
      aidReceipts: [],
    });
  });
});

describe("buildUnitPaymentReceiptViewModel", () => {
  it("détaille un seul encaissement", () => {
    const vm = buildUnitPaymentReceiptViewModel(
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
            {
              id: "p2",
              method: "cheque",
              label: "Chèque 2/2",
              amountCents: 10_000,
              receivedAt: "2026-09-15T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
      "p1",
      { documentNumber: "REC-2026-2027-00001", now: new Date("2026-09-28T12:00:00.000Z") }
    );

    expect(vm).not.toBeNull();
    expect(vm?.documentNumber).toBe("REC-2026-2027-00001");
    expect(vm?.payment.reference).toBe("123456");
    expect(vm?.payment.amountCents).toBe(10_000);
    expect(vm?.paidTotalCents).toBe(20_000);
    expect(vm?.remainingCents).toBe(0);
  });

  it("retourne null sans encaissement cible", () => {
    expect(
      buildUnitPaymentReceiptViewModel(
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
        "missing",
        { documentNumber: "REC-2026-2027-00099" }
      )
    ).toBeNull();
  });

  it("génère un PDF non vide", async () => {
    const vm = buildUnitPaymentReceiptViewModel(
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
      "p1",
      { documentNumber: "REC-2026-2027-00002", now: new Date("2026-09-28T12:00:00.000Z") }
    );
    expect(vm).not.toBeNull();
    const pdf = await buildPaymentReceiptPdf(vm!);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});

describe("buildPaymentSituationViewModel", () => {
  it("agrège facture et tous les encaissements sans n° de pièce", () => {
    const vm = buildPaymentSituationViewModel(
      "reg_1",
      {
        firstName: "Ada",
        lastName: "Lovelace",
        seasonLabel: "2026-2027",
        teamupInvoiceNumber: "FAC-2026-2027-00001",
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
          paymentInstallments: 2,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "p1",
              method: "cheque",
              label: "Chèque 1/2",
              amountCents: 10_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
              documentNumber: "REC-2026-2027-00001",
            },
            {
              id: "p2",
              method: "cheque",
              label: "Chèque 2/2",
              amountCents: 10_000,
              receivedAt: "2026-09-15T10:00:00.000Z",
              documentNumber: "REC-2026-2027-00002",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
      { now: new Date("2026-09-28T12:00:00.000Z") }
    );

    expect(vm?.settlementLabel).toBe("Soldé");
    expect(vm?.invoiceNumber).toBe("FAC-2026-2027-00001");
    expect(vm?.payments).toHaveLength(2);
    expect(vm?.paidTotalCents).toBe(20_000);
  });

  it("génère un PDF situation non vide", async () => {
    const vm = buildPaymentSituationViewModel("reg_sit", {
      firstName: "Ada",
      lastName: "Lovelace",
      status: "payment_requested",
      paymentStatus: "waiting_payment",
      pricingQuote: {
        catalogVersion: "v1",
        segmentLabel: "Adulte",
        subtotalCents: 10_000,
        totalCents: 10_000,
        warnings: [],
        requiresAdminReview: false,
        lines: [
          {
            id: "membership",
            kind: "membership",
            label: "Adhésion",
            amountCents: 10_000,
            source: "catalog",
          },
        ],
      },
    });
    expect(vm).not.toBeNull();
    const pdf = await buildPaymentSituationPdf(vm!);
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

