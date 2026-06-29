import {
  canSelfServiceCheckout,
  isAwaitingNonCardPayment,
  resolveSelfServicePayableCents,
} from "./self-service-checkout";

describe("self-service-checkout", () => {
  it("autorise le paiement en ligne pour carte et paiement demandé", () => {
    expect(
      canSelfServiceCheckout({
        status: "payment_requested",
        paymentAmountCents: 22_400,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 22_400,
          totalAmountCents: 22_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 22_400,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(true);
  });

  it("refuse si déjà payé ou hors carte", () => {
    expect(
      canSelfServiceCheckout({
        status: "paid",
        paymentAmountCents: 22_400,
        payment: { paymentMethod: "card" },
      })
    ).toBe(false);

    expect(
      canSelfServiceCheckout({
        status: "payment_requested",
        paymentStatus: "pending",
        paidAt: "2026-06-27T08:31:30.000Z",
        paymentAmountCents: 22_400,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 22_400,
          totalAmountCents: 22_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 22_400,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(false);

    expect(
      canSelfServiceCheckout({
        status: "payment_requested",
        paymentAmountCents: 22_400,
        payment: {
          paymentMethod: "cheque",
          amountToPayCents: 22_400,
          totalAmountCents: 22_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 22_400,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(false);

    expect(
      canSelfServiceCheckout({
        status: "in_review",
        paymentAmountCents: 22_400,
        payment: { paymentMethod: "card" },
      })
    ).toBe(false);
  });

  it("résout le montant depuis payment ou paymentAmountCents", () => {
    expect(
      resolveSelfServicePayableCents({
        paymentAmountCents: 15_000,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 22_400,
          totalAmountCents: 22_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 22_400,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(22_400);
    expect(resolveSelfServicePayableCents({ paymentAmountCents: 15_000 })).toBe(15_000);
  });

  it("détecte l'attente hors carte", () => {
    expect(
      isAwaitingNonCardPayment({
        status: "payment_requested",
        paymentAmountCents: 10_000,
        payment: {
          paymentMethod: "cheque",
          amountToPayCents: 10_000,
          totalAmountCents: 10_000,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 10_000,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(true);
    expect(
      isAwaitingNonCardPayment({
        status: "payment_requested",
        paymentAmountCents: 10_000,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 10_000,
          totalAmountCents: 10_000,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 0,
          remainingAmountCents: 10_000,
          paymentStatus: "waiting_payment",
        },
      })
    ).toBe(false);
  });
});
