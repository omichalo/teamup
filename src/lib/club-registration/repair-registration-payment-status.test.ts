import {
  detectRegistrationPaymentRepairKind,
  needsRegistrationPaymentStatusRepair,
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
});
