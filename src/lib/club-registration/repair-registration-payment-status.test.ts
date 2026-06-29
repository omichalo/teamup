import { needsRegistrationPaymentStatusRepair } from "./repair-registration-payment-status";

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
