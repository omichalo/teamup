import {
  detectRegistrationPaymentRepairKind,
  needsRegistrationPaymentStatusRepair,
  needsRegistrationSettlementFinalizeRepair,
  needsRegistrationSupplementReopenRepair,
} from "./repair-registration-payment-status";

describe("needsRegistrationPaymentStatusRepair", () => {
  it("détecte paidAt + paymentStatus pending", () => {
    expect(
      needsRegistrationPaymentStatusRepair({
        status: "paid",
        paymentStatus: "pending",
        paidAt: new Date("2026-06-27T08:31:30Z"),
      })
    ).toBe(true);
  });

  it("ignore les dossiers déjà payés", () => {
    expect(
      needsRegistrationPaymentStatusRepair({
        status: "paid",
        paymentStatus: "paid",
        paidAt: new Date(),
      })
    ).toBe(false);
  });

  it("ignore les dossiers non réglés", () => {
    expect(
      needsRegistrationPaymentStatusRepair({
        status: "payment_requested",
        paymentStatus: "pending",
      })
    ).toBe(false);
  });

  it("ignore paidAt avec reliquat (complément dû)", () => {
    expect(
      needsRegistrationPaymentStatusRepair({
        status: "payment_requested",
        paymentStatus: "pending",
        paidAt: "2026-08-29T06:01:40.323Z",
        payment: {
          paymentMethod: "card",
          totalAmountCents: 19_700,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 19_700,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_1",
              method: "card",
              label: "Carte",
              amountCents: 18_200,
              receivedAt: "2026-08-29T06:01:40.323Z",
            },
          ],
          paidAmountCents: 18_200,
          remainingAmountCents: 1_500,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe(false);
  });
});

describe("needsRegistrationSupplementReopenRepair", () => {
  it("détecte un dossier payé avec reliquat", () => {
    expect(
      needsRegistrationSupplementReopenRepair({
        status: "paid",
        paidAt: "2026-08-20T10:00:00.000Z",
        payment: {
          paymentMethod: "card",
          totalAmountCents: 27_400,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 27_400,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_cb",
              method: "card",
              label: "Carte",
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
});

describe("needsRegistrationSettlementFinalizeRepair", () => {
  it("détecte un paiement soldé sans status paid", () => {
    expect(
      needsRegistrationSettlementFinalizeRepair({
        status: "payment_requested",
        paymentStatus: "paid",
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_1",
              method: "cheque",
              label: "Chèque",
              amountCents: 20_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      })
    ).toBe(true);
  });

  it("ignore un dossier déjà paid", () => {
    expect(
      needsRegistrationSettlementFinalizeRepair({
        status: "paid",
        paidAt: "2026-09-01T10:00:00.000Z",
        paymentStatus: "paid",
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 20_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20_000,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [],
          paidAmountCents: 20_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      })
    ).toBe(false);
  });
});

describe("detectRegistrationPaymentRepairKind", () => {
  it("priorise la réouverture complément", () => {
    expect(
      detectRegistrationPaymentRepairKind({
        status: "paid",
        paymentStatus: "pending",
        paidAt: "2026-08-20T10:00:00.000Z",
        payment: {
          paymentMethod: "card",
          totalAmountCents: 27_400,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 27_400,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_cb",
              method: "card",
              label: "Carte",
              amountCents: 23_900,
              receivedAt: "2026-08-20T10:00:00.000Z",
            },
          ],
          paidAmountCents: 23_900,
          remainingAmountCents: 3_500,
          paymentStatus: "partially_paid",
        },
      })
    ).toBe("supplement_reopen");
  });

  it("détecte settlement_finalize avant legacy", () => {
    expect(
      detectRegistrationPaymentRepairKind({
        status: "in_review",
        paymentStatus: "paid",
        payment: {
          paymentMethod: "cheque",
          totalAmountCents: 15_000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 15_000,
          aids: [],
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "rp_1",
              method: "cheque",
              label: "Chèque",
              amountCents: 15_000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 15_000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      })
    ).toBe("settlement_finalize");
  });
});
