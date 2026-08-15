import {
  assertCanRequestRemainingCardPayment,
  preparePaymentForRemainingCardCheckout,
  REMAINING_BALANCE_EXPECTED_CANCEL_NOTE,
} from "./create-remaining-balance-checkout";
import type { RegistrationPayment } from "./types";

function basePayment(
  overrides: Partial<RegistrationPayment> = {}
): RegistrationPayment {
  return {
    totalAmountCents: 20_700,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 20_700,
    aids: [],
    paymentMethod: "holiday_vouchers",
    paymentInstallments: 1,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 20_700,
    paymentStatus: "manual_follow_up",
    ...overrides,
  };
}

describe("assertCanRequestRemainingCardPayment", () => {
  it("refuse un dossier déjà payé", () => {
    const result = assertCanRequestRemainingCardPayment({
      payment: basePayment({ paymentStatus: "paid", remainingAmountCents: 0 }),
      registrationData: { status: "paid" },
    });
    expect(result.ok).toBe(false);
  });

  it("refuse sans encaissement partiel", () => {
    const result = assertCanRequestRemainingCardPayment({
      payment: basePayment(),
      registrationData: { status: "payment_requested" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("encaissement partiel");
  });

  it("accepte un reste dû après encaissement", () => {
    const result = assertCanRequestRemainingCardPayment({
      payment: basePayment({
        paidAmountCents: 10_000,
        remainingAmountCents: 10_700,
        paymentStatus: "partially_paid",
        receivedPayments: [
          {
            id: "r1",
            method: "holiday_vouchers",
            label: "CV",
            amountCents: 10_000,
            receivedAt: "2026-07-10T00:00:00.000Z",
          },
        ],
      }),
      registrationData: { status: "payment_requested" },
    });
    expect(result).toEqual({ ok: true, remainingAmountCents: 10_700 });
  });
});

describe("preparePaymentForRemainingCardCheckout", () => {
  it("annule les échéances attendues et passe en waiting_payment", () => {
    const payment = basePayment({
      paymentMethod: "cheque",
      paidAmountCents: 8_000,
      remainingAmountCents: 12_700,
      paymentStatus: "partially_paid",
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
          amountCents: 8_000,
          receivedAt: "2026-07-10T00:00:00.000Z",
        },
      ],
    });

    const next = preparePaymentForRemainingCardCheckout(payment);
    expect(next.paymentStatus).toBe("waiting_payment");
    expect(next.expectedPayments.map((e) => e.status)).toEqual([
      "received",
      "cancelled",
    ]);
    expect(next.expectedPayments[1]?.note).toBe(REMAINING_BALANCE_EXPECTED_CANCEL_NOTE);
  });
});
