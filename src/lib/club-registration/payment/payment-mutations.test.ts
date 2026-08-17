import {
  CANCELLED_EXPECTED_REPLACED_NOTE,
  addManualReceivedPayment,
  cancelOutstandingExpectedPayments,
  markPaymentFullyPaid,
} from "./payment-mutations";
import type { ExpectedPayment, ReceivedPayment, RegistrationPayment } from "./types";

function chequePlan(amounts: number[]): ExpectedPayment[] {
  return amounts.map((expectedAmountCents, index) => ({
    id: `ep_${index + 1}`,
    method: "cheque" as const,
    label: `Chèque ${index + 1}/${amounts.length}`,
    expectedAmountCents,
    status: "expected" as const,
  }));
}

function basePayment(overrides: Partial<RegistrationPayment> = {}): RegistrationPayment {
  return {
    totalAmountCents: 30_000,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 30_000,
    aids: [],
    paymentMethod: "cheque",
    paymentInstallments: 3,
    expectedPayments: chequePlan([10_000, 10_000, 10_000]),
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 30_000,
    paymentStatus: "waiting_payment",
    ...overrides,
  };
}

describe("addManualReceivedPayment", () => {
  it("CAS B — encaissement d'un autre moyen : totaux à jour, mode prévu inchangé", () => {
    const next = addManualReceivedPayment(basePayment(), {
      method: "cash",
      label: "Espèces",
      amountCents: 10_000,
      receivedAt: "2026-08-17T10:00:00.000Z",
    });

    expect(next.paymentMethod).toBe("cheque");
    expect(next.paidAmountCents).toBe(10_000);
    expect(next.remainingAmountCents).toBe(20_000);
    expect(next.paymentStatus).toBe("partially_paid");
    expect(next.receivedPayments).toHaveLength(1);
    expect(next.receivedPayments[0].method).toBe("cash");
    expect(next.expectedPayments.every((line) => line.status === "expected")).toBe(true);
  });

  it("CAS E — solde couvert par CB : échéances encore expected passent en cancelled", () => {
    const next = addManualReceivedPayment(basePayment(), {
      method: "card",
      label: "Paiement Stripe",
      amountCents: 30_000,
      receivedAt: "2026-08-17T10:00:00.000Z",
    });

    expect(next.paymentMethod).toBe("cheque");
    expect(next.remainingAmountCents).toBe(0);
    expect(next.paymentStatus).toBe("paid");
    expect(next.expectedPayments.map((line) => line.status)).toEqual([
      "cancelled",
      "cancelled",
      "cancelled",
    ]);
    expect(next.expectedPayments[0].note).toBe(CANCELLED_EXPECTED_REPLACED_NOTE);
    expect(next.receivedPayments).toHaveLength(1);
    expect(next.receivedPayments[0].method).toBe("card");
  });

  it("ne modifie pas les lignes already received", () => {
    const alreadyReceived: ExpectedPayment = {
      id: "ep_1",
      method: "cheque",
      label: "Chèque 1/3",
      expectedAmountCents: 10_000,
      status: "received",
    };
    const stillExpected: ExpectedPayment = {
      id: "ep_2",
      method: "cheque",
      label: "Chèque 2/3",
      expectedAmountCents: 10_000,
      status: "expected",
    };
    const previous: ReceivedPayment = {
      id: "rp_1",
      method: "cheque",
      label: "Chèque 1/3",
      amountCents: 10_000,
      receivedAt: "2026-08-01T10:00:00.000Z",
      expectedPaymentId: "ep_1",
    };

    const next = addManualReceivedPayment(
      basePayment({
        expectedPayments: [alreadyReceived, stillExpected],
        receivedPayments: [previous],
        paidAmountCents: 10_000,
        remainingAmountCents: 20_000,
        paymentStatus: "partially_paid",
      }),
      {
        method: "card",
        label: "Paiement Stripe",
        amountCents: 20_000,
        receivedAt: "2026-08-17T10:00:00.000Z",
      }
    );

    expect(next.expectedPayments[0].status).toBe("received");
    expect(next.expectedPayments[1].status).toBe("cancelled");
  });
});

describe("cancelOutstandingExpectedPayments", () => {
  it("ne rapproche pas un paiement partiel", () => {
    const payment = basePayment({
      paidAmountCents: 5_000,
      remainingAmountCents: 25_000,
      paymentStatus: "partially_paid",
    });
    expect(cancelOutstandingExpectedPayments(payment).expectedPayments).toEqual(
      payment.expectedPayments
    );
  });
});

describe("markPaymentFullyPaid", () => {
  it("CAS J — n'invente plus un moyen à partir du mode prévu", () => {
    const next = markPaymentFullyPaid(basePayment(), {
      method: "cash",
      recordedBy: "secretary",
    });

    expect(next.receivedPayments).toHaveLength(1);
    expect(next.receivedPayments[0].method).toBe("cash");
    expect(next.paymentMethod).toBe("cheque");
    expect(next.remainingAmountCents).toBe(0);
    expect(next.paymentStatus).toBe("paid");
  });
});
