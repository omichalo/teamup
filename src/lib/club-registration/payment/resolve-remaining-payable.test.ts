import {
  parseStripeChargeMode,
  resolveCheckoutChargeAmounts,
  resolveOnlinePayableCents,
  resolveRemainingPayableCents,
  resolveStripeChargeForMode,
} from "./resolve-remaining-payable";
import type { ReceivedPayment, RegistrationPayment } from "./types";

function payment(overrides: Partial<RegistrationPayment> = {}): RegistrationPayment {
  return {
    totalAmountCents: 30_000,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 30_000,
    aids: [],
    paymentMethod: "cheque",
    paymentInstallments: 3,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 30_000,
    paymentStatus: "waiting_payment",
    ...overrides,
  };
}

function cashReceived(amountCents: number): ReceivedPayment {
  return {
    id: "rp_cash",
    method: "cash",
    label: "Espèces",
    amountCents,
    receivedAt: "2026-08-17T10:00:00.000Z",
  };
}

describe("resolveRemainingPayableCents", () => {
  it("CAS A — mode prévu chèque, 300 €, aucun encaissement → reste 300 €", () => {
    expect(resolveRemainingPayableCents(payment())).toBe(30_000);
  });

  it("CAS B — 100 € espèces reçus → reste 200 €, mode prévu inchangé", () => {
    const partial = payment({
      receivedPayments: [cashReceived(10_000)],
      paidAmountCents: 10_000,
      remainingAmountCents: 20_000,
      paymentStatus: "partially_paid",
    });
    expect(resolveRemainingPayableCents(partial)).toBe(20_000);
    expect(partial.paymentMethod).toBe("cheque");
  });

  it("retourne 0 si le dossier est soldé", () => {
    expect(
      resolveRemainingPayableCents(
        payment({
          paidAmountCents: 30_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        })
      )
    ).toBe(0);
  });

  it("retourne 0 sans objet payment", () => {
    expect(resolveRemainingPayableCents(null)).toBe(0);
  });
});

describe("resolveCheckoutChargeAmounts", () => {
  it("CAS C/H — Checkout et relance utilisent le solde, pas le net initial", () => {
    const amounts = resolveCheckoutChargeAmounts(
      payment({
        receivedPayments: [cashReceived(10_000)],
        paidAmountCents: 10_000,
        remainingAmountCents: 20_000,
        paymentStatus: "partially_paid",
      }),
      30_000
    );
    expect(amounts.amountToPayCents).toBe(30_000);
    expect(amounts.alreadyPaidCents).toBe(10_000);
    expect(amounts.remainingPayableCents).toBe(20_000);
    expect(amounts.onlinePayableCents).toBe(20_000);
    expect(amounts.reservedHolidayVoucherCents).toBe(0);
  });

  it("sans payment, retombe sur le montant fourni", () => {
    expect(resolveCheckoutChargeAmounts(null, 15_000)).toEqual({
      amountToPayCents: 15_000,
      alreadyPaidCents: 0,
      remainingPayableCents: 15_000,
      onlinePayableCents: 15_000,
      reservedHolidayVoucherCents: 0,
    });
  });

  it("lien CB = complément si des chèques vacances sont encore dus", () => {
    const mixed = payment({
      paymentMethod: "holiday_vouchers",
      holidayVoucherAmountCents: 25_000,
      remainingPaymentMethod: "card",
    });
    expect(resolveOnlinePayableCents(mixed)).toBe(5_000);
    expect(resolveCheckoutChargeAmounts(mixed, 30_000).onlinePayableCents).toBe(5_000);
    expect(resolveCheckoutChargeAmounts(mixed, 30_000).reservedHolidayVoucherCents).toBe(
      25_000
    );
  });

  it("après complément CB, plus rien à demander en ligne tant que les CV manquent", () => {
    const afterCard = payment({
      paymentMethod: "holiday_vouchers",
      holidayVoucherAmountCents: 25_000,
      remainingPaymentMethod: "card",
      receivedPayments: [
        {
          id: "rp_card",
          method: "card",
          label: "Paiement Stripe",
          amountCents: 5_000,
          receivedAt: "2026-08-19T10:00:00.000Z",
        },
      ],
      paidAmountCents: 5_000,
      remainingAmountCents: 25_000,
      paymentStatus: "partially_paid",
    });
    expect(resolveRemainingPayableCents(afterCard)).toBe(25_000);
    expect(resolveOnlinePayableCents(afterCard)).toBe(0);
  });

  it("le mode remaining encaisse tout le solde, y compris la part CV prévue", () => {
    const mixed = payment({
      paymentMethod: "holiday_vouchers",
      holidayVoucherAmountCents: 25_000,
      remainingPaymentMethod: "card",
    });
    const amounts = resolveCheckoutChargeAmounts(mixed, 30_000);
    expect(parseStripeChargeMode(undefined)).toBe("online");
    expect(parseStripeChargeMode("remaining")).toBe("remaining");
    expect(resolveStripeChargeForMode(amounts, "online")).toEqual({
      stripeCents: 5_000,
      reservedHolidayVoucherCents: 25_000,
    });
    expect(resolveStripeChargeForMode(amounts, "remaining")).toEqual({
      stripeCents: 30_000,
      reservedHolidayVoucherCents: 0,
    });
  });

  it("après encaissement des CV, le lien CB demande le solde restant", () => {
    const afterVouchers = payment({
      paymentMethod: "holiday_vouchers",
      holidayVoucherAmountCents: 25_000,
      remainingPaymentMethod: "card",
      receivedPayments: [
        {
          id: "rp_cv",
          method: "holiday_vouchers",
          label: "Chèques vacances",
          amountCents: 25_000,
          receivedAt: "2026-08-19T10:00:00.000Z",
        },
      ],
      paidAmountCents: 25_000,
      remainingAmountCents: 5_000,
      paymentStatus: "partially_paid",
    });
    expect(resolveOnlinePayableCents(afterVouchers)).toBe(5_000);
  });
});
