import {
  applyStripeCheckoutPaymentToRegistration,
  isRemainingBalanceCheckoutSession,
  resolveStripeCheckoutPaidAmountCents,
} from "./apply-stripe-checkout-payment";
import type { RegistrationPayment } from "./types";

function basePayment(
  overrides: Partial<RegistrationPayment> = {}
): RegistrationPayment {
  return {
    totalAmountCents: 20_700,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 20_700,
    aids: [],
    paymentMethod: "cheque",
    paymentInstallments: 2,
    expectedPayments: [
      {
        id: "e1",
        method: "cheque",
        label: "Chèque 1/2",
        expectedAmountCents: 10_000,
        status: "received",
      },
      {
        id: "e2",
        method: "cheque",
        label: "Chèque 2/2",
        expectedAmountCents: 10_700,
        status: "expected",
      },
    ],
    receivedPayments: [
      {
        id: "r1",
        method: "cheque",
        label: "Chèque 1/2",
        amountCents: 10_000,
        receivedAt: "2026-07-10T00:00:00.000Z",
      },
    ],
    paidAmountCents: 10_000,
    remainingAmountCents: 10_700,
    paymentStatus: "partially_paid",
    ...overrides,
  };
}

describe("isRemainingBalanceCheckoutSession", () => {
  it("détecte le metadata checkoutKind", () => {
    expect(
      isRemainingBalanceCheckoutSession({
        metadata: { checkoutKind: "remaining_balance" },
      })
    ).toBe(true);
    expect(isRemainingBalanceCheckoutSession({ metadata: {} })).toBe(false);
  });
});

describe("resolveStripeCheckoutPaidAmountCents", () => {
  it("utilise amount_total en priorité", () => {
    expect(
      resolveStripeCheckoutPaidAmountCents({
        session: { amount_total: 5_000 },
        fallbackPaymentAmountCents: 20_700,
        fallbackAmountToPayCents: 20_700,
        remainingBalance: true,
      })
    ).toBe(5_000);
  });

  it("ne retombe pas sur le montant total pour un solde", () => {
    expect(
      resolveStripeCheckoutPaidAmountCents({
        session: {},
        fallbackPaymentAmountCents: 20_700,
        fallbackAmountToPayCents: 20_700,
        remainingBalance: true,
      })
    ).toBe(0);
  });
});

describe("applyStripeCheckoutPaymentToRegistration", () => {
  it("solde exact → payé et échéances annulées", () => {
    const { payment, fullyPaid } = applyStripeCheckoutPaymentToRegistration({
      payment: basePayment(),
      amountCents: 10_700,
      sessionId: "cs_test",
      remainingBalance: true,
    });

    expect(fullyPaid).toBe(true);
    expect(payment.paymentStatus).toBe("paid");
    expect(payment.remainingAmountCents).toBe(0);
    expect(payment.expectedPayments.map((e) => e.status)).toEqual([
      "received",
      "cancelled",
    ]);
    expect(payment.receivedPayments.at(-1)?.label).toContain("Solde");
  });

  it("sous-paiement solde → partiellement payé sans forcer paid", () => {
    const { payment, fullyPaid } = applyStripeCheckoutPaymentToRegistration({
      payment: basePayment(),
      amountCents: 2_000,
      remainingBalance: true,
    });

    expect(fullyPaid).toBe(false);
    expect(payment.paymentStatus).toBe("partially_paid");
    expect(payment.remainingAmountCents).toBe(8_700);
  });

  it("checkout complet conserve markPaymentFullyPaid", () => {
    const { payment, fullyPaid } = applyStripeCheckoutPaymentToRegistration({
      payment: basePayment({
        paidAmountCents: 0,
        remainingAmountCents: 20_700,
        receivedPayments: [],
        expectedPayments: [],
        paymentMethod: "card",
        paymentStatus: "waiting_payment",
      }),
      amountCents: 20_700,
      remainingBalance: false,
    });

    expect(fullyPaid).toBe(true);
    expect(payment.paymentStatus).toBe("paid");
    expect(payment.remainingAmountCents).toBe(0);
  });

  it("checkout complet n’annule pas les échéances avec la note solde CB", () => {
    const { payment } = applyStripeCheckoutPaymentToRegistration({
      payment: basePayment({
        paidAmountCents: 0,
        remainingAmountCents: 20_700,
        receivedPayments: [],
        paymentMethod: "card",
        paymentStatus: "waiting_payment",
        expectedPayments: [
          {
            id: "e1",
            method: "cheque",
            label: "Chèque 1/1",
            expectedAmountCents: 20_700,
            status: "expected",
          },
        ],
      }),
      amountCents: 20_700,
      remainingBalance: false,
    });

    expect(payment.paymentStatus).toBe("paid");
    expect(payment.expectedPayments.some((e) => e.note?.includes("solde"))).toBe(
      false
    );
  });
});
