import { FieldValue } from "firebase-admin/firestore";
import {
  buildReopenForOutstandingBalanceFirestorePatch,
  paymentWriteWithSettlement,
  shouldMarkRegistrationPaid,
} from "./settlement-firestore";
import type { RegistrationPayment } from "./types";

function basePayment(overrides: Partial<RegistrationPayment> = {}): RegistrationPayment {
  return {
    totalAmountCents: 20_000,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 20_000,
    aids: [],
    paymentMethod: "card",
    paymentInstallments: 1,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 20_000,
    paymentStatus: "waiting_payment",
    ...overrides,
  };
}

describe("shouldMarkRegistrationPaid", () => {
  it("exige remaining 0 et paymentStatus paid", () => {
    expect(
      shouldMarkRegistrationPaid(
        basePayment({
          remainingAmountCents: 0,
          paidAmountCents: 20_000,
          paymentStatus: "paid",
        })
      )
    ).toBe(true);
    expect(
      shouldMarkRegistrationPaid(
        basePayment({
          remainingAmountCents: 1,
          paidAmountCents: 19_999,
          paymentStatus: "partially_paid",
        })
      )
    ).toBe(false);
  });
});

describe("paymentWriteWithSettlement", () => {
  it("marque paid + paidAt quand soldé", () => {
    const write = paymentWriteWithSettlement(
      basePayment({
        remainingAmountCents: 0,
        paidAmountCents: 20_000,
        paymentStatus: "paid",
        receivedPayments: [
          {
            id: "rp1",
            method: "card",
            label: "CB",
            amountCents: 20_000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
      })
    );
    expect(write.status).toBe("paid");
    expect(write.paidAt).toBeDefined();
  });

  it("purge toujours paidAt quand non soldé", () => {
    const write = paymentWriteWithSettlement(
      basePayment({
        remainingAmountCents: 5_000,
        paidAmountCents: 15_000,
        paymentStatus: "partially_paid",
      })
    );
    expect(write.paidAt).toEqual(FieldValue.delete());
    expect(write.status).toBeUndefined();
  });

  it("rouvre status si le dossier était paid", () => {
    const write = paymentWriteWithSettlement(
      basePayment({
        remainingAmountCents: 5_000,
        paidAmountCents: 15_000,
        paymentStatus: "partially_paid",
      }),
      { previousRegistrationStatus: "paid" }
    );
    expect(write.status).toBe("payment_requested");
    expect(write.paidAt).toEqual(FieldValue.delete());
  });
});

describe("buildReopenForOutstandingBalanceFirestorePatch", () => {
  it("centralise status + delete paidAt", () => {
    const patch = buildReopenForOutstandingBalanceFirestorePatch({
      withSupplementRequestedAt: true,
    });
    expect(patch.status).toBe("payment_requested");
    expect(patch.paidAt).toEqual(FieldValue.delete());
    expect(patch.supplementRequestedAt).toBeDefined();
  });
});
