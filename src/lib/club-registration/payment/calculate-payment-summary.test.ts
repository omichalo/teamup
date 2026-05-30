import { calculatePaymentSummary } from "./calculate-payment-summary";
import type { PaymentAid, ReceivedPayment } from "./types";

const aid = (amountCents: number): PaymentAid => ({
  type: "pass_sport",
  label: "Pass Sport",
  amountCents,
});

const received = (amountCents: number): ReceivedPayment => ({
  id: "r1",
  method: "cheque",
  label: "Chèque 1/2",
  amountCents,
  receivedAt: "2025-09-01T12:00:00.000Z",
});

describe("calculatePaymentSummary", () => {
  it("calcule le reste à payer sans aide ni paiement reçu", () => {
    const summary = calculatePaymentSummary({
      totalAmountCents: 20_000,
      aids: [],
      receivedPayments: [],
      currentPaymentStatus: "pending_validation",
    });
    expect(summary.assistanceTotalAmountCents).toBe(0);
    expect(summary.amountToPayCents).toBe(20_000);
    expect(summary.paidAmountCents).toBe(0);
    expect(summary.remainingAmountCents).toBe(20_000);
    expect(summary.paymentStatus).toBe("pending_validation");
    expect(summary.aidsExceedTotal).toBe(false);
  });

  it("déduit les aides du montant à payer", () => {
    const summary = calculatePaymentSummary({
      totalAmountCents: 20_000,
      aids: [aid(6_000)],
      receivedPayments: [],
    });
    expect(summary.amountToPayCents).toBe(14_000);
    expect(summary.assistanceTotalAmountCents).toBe(6_000);
  });

  it("plafonne le reste à payer à zéro si aides supérieures au total", () => {
    const summary = calculatePaymentSummary({
      totalAmountCents: 10_000,
      aids: [aid(15_000)],
      receivedPayments: [],
    });
    expect(summary.amountToPayCents).toBe(0);
    expect(summary.aidsExceedTotal).toBe(true);
    expect(summary.paymentStatus).toBe("paid");
  });

  it("passe en paiement partiel puis payé", () => {
    const partial = calculatePaymentSummary({
      totalAmountCents: 20_000,
      aids: [aid(2_000)],
      receivedPayments: [received(5_000)],
      currentPaymentStatus: "waiting_payment",
    });
    expect(partial.paymentStatus).toBe("partially_paid");
    expect(partial.remainingAmountCents).toBe(13_000);

    const paid = calculatePaymentSummary({
      totalAmountCents: 20_000,
      aids: [aid(2_000)],
      receivedPayments: [received(18_000)],
    });
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.remainingAmountCents).toBe(0);
  });

  it("conserve manual_follow_up si demandé", () => {
    const summary = calculatePaymentSummary({
      totalAmountCents: 20_000,
      aids: [],
      receivedPayments: [],
      currentPaymentStatus: "manual_follow_up",
      preserveManualFollowUp: true,
    });
    expect(summary.paymentStatus).toBe("manual_follow_up");
  });
});
