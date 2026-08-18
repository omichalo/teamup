import {
  applyStripeCheckoutPaid,
  hasStripeCheckoutReceipt,
  stripeCheckoutReceiptNote,
} from "./apply-stripe-checkout-paid";
import { addManualReceivedPayment } from "./payment-mutations";
import type { ExpectedPayment, RegistrationPayment } from "./types";

function chequePlan(): ExpectedPayment[] {
  return [1, 2, 3].map((n) => ({
    id: `ep_${n}`,
    method: "cheque" as const,
    label: `Chèque ${n}/3`,
    expectedAmountCents: 10_000,
    status: "expected" as const,
  }));
}

function basePayment(): RegistrationPayment {
  return {
    totalAmountCents: 30_000,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 30_000,
    aids: [],
    paymentMethod: "cheque",
    paymentInstallments: 3,
    expectedPayments: chequePlan(),
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 30_000,
    paymentStatus: "waiting_payment",
  };
}

describe("applyStripeCheckoutPaid", () => {
  it("CAS D — solde Stripe après espèces : deux received, reste 0, mode prévu chèque", () => {
    const withCash = addManualReceivedPayment(basePayment(), {
      method: "cash",
      label: "Espèces",
      amountCents: 10_000,
      receivedAt: "2026-08-17T09:00:00.000Z",
    });

    const result = applyStripeCheckoutPaid({
      payment: withCash,
      sessionId: "cs_test_1",
      amountTotal: 20_000,
    });

    expect(result.duplicate).toBe(false);
    expect(result.markRegistrationPaid).toBe(true);
    expect(result.payment?.paymentMethod).toBe("cheque");
    expect(result.payment?.remainingAmountCents).toBe(0);
    expect(result.payment?.paymentStatus).toBe("paid");
    expect(result.payment?.receivedPayments.map((line) => line.method)).toEqual([
      "cash",
      "card",
    ]);
    expect(result.payment?.receivedPayments[1].amountCents).toBe(20_000);
    expect(result.payment?.expectedPayments.every((line) => line.status === "cancelled")).toBe(
      true
    );
  });

  it("CAS I — webhook reçu deux fois : pas de double receivedPayment", () => {
    const first = applyStripeCheckoutPaid({
      payment: basePayment(),
      sessionId: "cs_test_dup",
      amountTotal: 30_000,
    });
    const second = applyStripeCheckoutPaid({
      existingStatus: "paid",
      payment: first.payment,
      sessionId: "cs_test_dup",
      amountTotal: 30_000,
    });

    expect(second.duplicate).toBe(true);
    expect(second.payment?.receivedPayments).toHaveLength(1);
    expect(hasStripeCheckoutReceipt(second.payment!, "cs_test_dup")).toBe(true);
    expect(second.payment?.receivedPayments[0].note).toBe(
      stripeCheckoutReceiptNote("cs_test_dup")
    );
  });

  it("n'invente pas de complément si Stripe n'a pas soldé le dossier", () => {
    const result = applyStripeCheckoutPaid({
      payment: basePayment(),
      sessionId: "cs_test_partial",
      amountTotal: 10_000,
    });

    expect(result.markRegistrationPaid).toBe(false);
    expect(result.payment?.paymentStatus).toBe("partially_paid");
    expect(result.payment?.remainingAmountCents).toBe(20_000);
    expect(result.payment?.receivedPayments).toHaveLength(1);
    expect(result.payment?.paymentMethod).toBe("cheque");
  });

  it("ignore un événement sans montant Stripe", () => {
    const result = applyStripeCheckoutPaid({
      payment: basePayment(),
      sessionId: "cs_test_none",
    });
    expect(result.ignored).toBe("missing stripe amount");
    expect(result.payment?.receivedPayments).toHaveLength(0);
    expect(result.markRegistrationPaid).toBe(false);
  });
});
