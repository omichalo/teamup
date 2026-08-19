import {
  buildPaymentSyncPatchForQuote,
  syncPaymentAfterQuoteChange,
} from "./sync-payment-after-quote-change";
import type { ExpectedPayment, RegistrationPayment } from "./types";

function basePayment(overrides: Partial<RegistrationPayment> = {}): RegistrationPayment {
  return {
    totalAmountCents: 23_900,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 23_900,
    aids: [],
    paymentMethod: "holiday_vouchers",
    paymentInstallments: 1,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 23_900,
    holidayVoucherAmountCents: 23_900,
    paymentStatus: "pending_validation",
    ...overrides,
  };
}

describe("syncPaymentAfterQuoteChange", () => {
  it("aligne totaux et solde sur le nouveau devis, sans toucher aux CV déclarés", () => {
    const next = syncPaymentAfterQuoteChange(basePayment(), 26_400);

    expect(next.totalAmountCents).toBe(26_400);
    expect(next.amountToPayCents).toBe(26_400);
    expect(next.remainingAmountCents).toBe(26_400);
    expect(next.holidayVoucherAmountCents).toBe(23_900);
    expect(next.paymentMethod).toBe("holiday_vouchers");
    expect(next.paymentStatus).toBe("pending_validation");
  });

  it("conserve les encaissements et recalcule le reliquat", () => {
    const next = syncPaymentAfterQuoteChange(
      basePayment({
        receivedPayments: [
          {
            id: "rp_1",
            method: "holiday_vouchers",
            label: "Chèques vacances",
            amountCents: 23_900,
            receivedAt: "2026-08-19T10:00:00.000Z",
          },
        ],
        paidAmountCents: 23_900,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      }),
      26_400
    );

    expect(next.paidAmountCents).toBe(23_900);
    expect(next.remainingAmountCents).toBe(2_500);
    expect(next.paymentStatus).toBe("partially_paid");
    expect(next.holidayVoucherAmountCents).toBe(23_900);
  });

  it("régénère les échéances chèque tant qu'aucune n'est reçue", () => {
    const expected: ExpectedPayment[] = [
      {
        id: "ep_old",
        method: "cheque",
        label: "Chèque 1/1",
        expectedAmountCents: 23_900,
        status: "expected",
      },
    ];
    const next = syncPaymentAfterQuoteChange(
      basePayment({
        paymentMethod: "cheque",
        expectedPayments: expected,
      }),
      26_400
    );

    expect(next.expectedPayments).toHaveLength(1);
    expect(next.expectedPayments[0].expectedAmountCents).toBe(26_400);
    expect(next.expectedPayments[0].id).not.toBe("ep_old");
  });

  it("ne régénère pas les échéances si un chèque a déjà été reçu", () => {
    const next = syncPaymentAfterQuoteChange(
      basePayment({
        paymentMethod: "cheque",
        expectedPayments: [
          {
            id: "ep_1",
            method: "cheque",
            label: "Chèque 1/1",
            expectedAmountCents: 23_900,
            status: "received",
          },
        ],
      }),
      26_400
    );

    expect(next.expectedPayments[0].id).toBe("ep_1");
    expect(next.expectedPayments[0].status).toBe("received");
    expect(next.remainingAmountCents).toBe(26_400);
  });
});

describe("buildPaymentSyncPatchForQuote", () => {
  it("écrit le paiement nested et le montant plat", () => {
    const patch = buildPaymentSyncPatchForQuote({
      currentData: { payment: basePayment(), paymentAmountCents: 23_900 },
      invoiceTotalCents: 26_400,
    });

    expect(patch.paymentAmountCents).toBe(26_400);
    expect(patch.payment).toMatchObject({
      totalAmountCents: 26_400,
      amountToPayCents: 26_400,
      remainingAmountCents: 26_400,
      holidayVoucherAmountCents: 23_900,
    });
  });

  it("ne réécrit pas si le paiement est déjà aligné", () => {
    const aligned = basePayment({
      totalAmountCents: 26_400,
      amountToPayCents: 26_400,
      remainingAmountCents: 26_400,
    });
    expect(
      buildPaymentSyncPatchForQuote({
        currentData: { payment: aligned, paymentAmountCents: 26_400 },
        invoiceTotalCents: 26_400,
      })
    ).toEqual({});
  });
});
