import {
  canSelfServiceCheckout,
  canSelfServiceOnlineCheckout,
  canSelfServiceRemainingOverride,
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

  it("CAS F — autorise le self-service même si le mode prévu n'est pas carte", () => {
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
    ).toBe(true);
  });

  it("CAS G — refuse si soldé sans reliquat ou dossier pas encore prêt", () => {
    expect(
      canSelfServiceCheckout({
        status: "paid",
        paymentAmountCents: 22_400,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 22_400,
          totalAmountCents: 22_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_1",
              method: "card",
              label: "Carte",
              amountCents: 22_400,
              receivedAt: "2026-06-27T08:31:30.000Z",
            },
          ],
          paidAmountCents: 22_400,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      })
    ).toBe(false);

    expect(
      canSelfServiceCheckout({
        status: "in_review",
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
  });

  it("autorise le complément CB depuis un dossier déjà payé", () => {
    expect(
      canSelfServiceCheckout({
        status: "paid",
        paidAt: "2026-08-20T10:00:00.000Z",
        paymentAmountCents: 27_400,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 27_400,
          totalAmountCents: 27_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_cb",
              method: "card",
              label: "Carte bancaire",
              amountCents: 23_900,
              receivedAt: "2026-08-20T10:00:00.000Z",
            },
          ],
          paidAmountCents: 23_900,
          remainingAmountCents: 3_500,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(true);
    expect(
      canSelfServiceCheckout({
        status: "payment_requested",
        paymentAmountCents: 27_400,
        payment: {
          paymentMethod: "card",
          amountToPayCents: 27_400,
          totalAmountCents: 27_400,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_cb",
              method: "card",
              label: "Carte bancaire",
              amountCents: 23_900,
              receivedAt: "2026-08-20T10:00:00.000Z",
            },
          ],
          paidAmountCents: 23_900,
          remainingAmountCents: 3_500,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(true);
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
    expect(
      resolveSelfServicePayableCents({
        paymentAmountCents: 30_000,
        payment: {
          paymentMethod: "cheque",
          amountToPayCents: 30_000,
          totalAmountCents: 30_000,
          assistanceTotalAmountCents: 0,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 10_000,
          remainingAmountCents: 20_000,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(20_000);
    expect(resolveSelfServicePayableCents({ paymentAmountCents: 15_000 })).toBe(15_000);
  });

  it("pour des chèques vacances, le self-service propose le complément et tout le solde", () => {
    const mixed = {
      status: "payment_requested",
      paymentAmountCents: 30_000,
      payment: {
        paymentMethod: "holiday_vouchers",
        amountToPayCents: 30_000,
        totalAmountCents: 30_000,
        assistanceTotalAmountCents: 0,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [],
        paidAmountCents: 0,
        remainingAmountCents: 30_000,
        holidayVoucherAmountCents: 25_000,
        remainingPaymentMethod: "card",
        paymentStatus: "waiting_payment",
      },
    };
    expect(resolveSelfServicePayableCents(mixed)).toBe(5_000);
    expect(canSelfServiceOnlineCheckout(mixed)).toBe(true);
    expect(canSelfServiceRemainingOverride(mixed)).toBe(true);
    expect(canSelfServiceCheckout(mixed)).toBe(true);

    const afterCard = {
      status: "payment_requested",
      paymentAmountCents: 30_000,
      payment: {
        paymentMethod: "holiday_vouchers",
        amountToPayCents: 30_000,
        totalAmountCents: 30_000,
        assistanceTotalAmountCents: 0,
        aids: [],
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [],
        paidAmountCents: 5_000,
        remainingAmountCents: 25_000,
        holidayVoucherAmountCents: 25_000,
        remainingPaymentMethod: "card",
        paymentStatus: "partially_paid",
      },
    };
    expect(canSelfServiceOnlineCheckout(afterCard)).toBe(false);
    expect(canSelfServiceRemainingOverride(afterCard)).toBe(true);
    expect(canSelfServiceCheckout(afterCard)).toBe(true);
  });

  it("n'affiche plus l'attente hors carte si le self-service Stripe est ouvert", () => {
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
    ).toBe(false);
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
