import {
  buildPaymentAuditRepairPlan,
} from "./repair-payment-audit-findings";
import { CANCELLED_EXPECTED_REPLACED_NOTE } from "./payment/payment-mutations";

function basePayment(overrides: Record<string, unknown> = {}) {
  return {
    paymentMethod: "cheque",
    totalAmountCents: 30_000,
    assistanceTotalAmountCents: 0,
    amountToPayCents: 30_000,
    aids: [],
    paymentInstallments: 2,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents: 0,
    remainingAmountCents: 30_000,
    paymentStatus: "waiting_payment",
    ...overrides,
  };
}

describe("buildPaymentAuditRepairPlan", () => {
  it("point 2 — efface paidAt quand un reliquat existe", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "payment_requested",
      paymentStatus: "pending",
      paidAt: "2026-09-06T16:36:39.698Z",
      payment: basePayment({
        receivedPayments: [
          {
            id: "rp_1",
            method: "cheque",
            label: "Chèque",
            amountCents: 20_000,
            receivedAt: "2026-09-06T16:36:39.698Z",
          },
        ],
        paidAmountCents: 20_000,
        remainingAmountCents: 10_000,
        paymentStatus: "partially_paid",
      }),
    });

    expect(plan).not.toBeNull();
    expect(plan!.kinds).toContain("clear_paid_at_with_balance");
    expect(plan!.patch.paidAt).toBeNull();
    expect(plan!.patch.paymentStatus).toBe("pending");
    expect(
      (plan!.patch.payment as { paymentStatus: string }).paymentStatus
    ).toBe("partially_paid");
  });

  it("point 2 — rouvre un dossier paid avec reliquat", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "paid",
      paymentStatus: "paid",
      paidAt: "2026-09-01T10:00:00.000Z",
      payment: basePayment({
        paymentMethod: "card",
        paymentInstallments: 1,
        receivedPayments: [
          {
            id: "rp_1",
            method: "card",
            label: "Carte",
            amountCents: 25_000,
            receivedAt: "2026-09-01T10:00:00.000Z",
          },
        ],
        paidAmountCents: 25_000,
        remainingAmountCents: 5_000,
        paymentStatus: "partially_paid",
      }),
    });

    expect(plan!.kinds).toContain("clear_paid_at_with_balance");
    expect(plan!.patch.status).toBe("payment_requested");
    expect(plan!.patch.paidAt).toBeNull();
  });

  it("point 3 — annule les échéances chèque fantômes sur soldé", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "paid",
      paymentStatus: "paid",
      paidAt: "2026-09-05T10:00:00.000Z",
      payment: basePayment({
        expectedPayments: [
          {
            id: "ep_1",
            method: "cheque",
            label: "Chèque 1/2",
            expectedAmountCents: 15_000,
            status: "expected",
          },
          {
            id: "ep_2",
            method: "cheque",
            label: "Chèque 2/2",
            expectedAmountCents: 15_000,
            status: "expected",
          },
        ],
        receivedPayments: [
          {
            id: "rp_1",
            method: "card",
            label: "Carte",
            amountCents: 30_000,
            receivedAt: "2026-09-05T10:00:00.000Z",
          },
        ],
        paidAmountCents: 30_000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      }),
    });

    expect(plan!.kinds).toContain("cancel_ghost_cheque_plan");
    const expected = (plan!.patch.payment as { expectedPayments: Array<{ status: string; note?: string }> })
      .expectedPayments;
    expect(expected.every((line) => line.status === "cancelled")).toBe(true);
    expect(expected[0]?.note).toBe(CANCELLED_EXPECTED_REPLACED_NOTE);
  });

  it("point 4 — aligne la déclaration CV sur les encaissements CV", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "paid",
      paymentStatus: "paid",
      paidAt: "2026-09-10T10:00:00.000Z",
      payment: basePayment({
        paymentMethod: "holiday_vouchers",
        paymentInstallments: 1,
        holidayVoucherAmountCents: 20_000,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rp_1",
            method: "card",
            label: "Carte",
            amountCents: 30_000,
            receivedAt: "2026-09-10T10:00:00.000Z",
          },
        ],
        paidAmountCents: 30_000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      }),
    });

    expect(plan!.kinds).toContain("align_holiday_voucher_declared");
    expect(
      (plan!.patch.payment as { holidayVoucherAmountCents: number })
        .holidayVoucherAmountCents
    ).toBe(0);
  });

  it("point 5 — synchronise paymentStatus racine legacy pending", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "payment_requested",
      paymentStatus: "manual_follow_up",
      payment: basePayment({
        paymentMethod: "card",
        paymentInstallments: 1,
        paymentStatus: "waiting_payment",
        remainingAmountCents: 30_000,
      }),
    });

    expect(plan!.kinds).toContain("sync_root_payment_status");
    expect(plan!.patch.paymentStatus).toBe("pending");
  });

  it("ne touche pas un dossier cohérent soldé", () => {
    const plan = buildPaymentAuditRepairPlan({
      status: "paid",
      paymentStatus: "paid",
      paymentAmountCents: 30_000,
      paidAt: "2026-09-10T10:00:00.000Z",
      payment: basePayment({
        paymentMethod: "card",
        paymentInstallments: 1,
        expectedPayments: [],
        receivedPayments: [
          {
            id: "rp_1",
            method: "card",
            label: "Carte",
            amountCents: 30_000,
            receivedAt: "2026-09-10T10:00:00.000Z",
          },
        ],
        paidAmountCents: 30_000,
        remainingAmountCents: 0,
        paymentStatus: "paid",
      }),
    });

    expect(plan).toBeNull();
  });
});
