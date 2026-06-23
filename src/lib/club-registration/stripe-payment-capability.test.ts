import { createStripePaymentForRegistration } from "@/lib/club-registration/stripe";

describe("createStripePaymentForRegistration", () => {
  it("autorise Stripe pour la carte bancaire", async () => {
    await expect(
      createStripePaymentForRegistration({
        registrationId: "reg_1",
        amountToPayCents: 25_000,
        paymentMethod: "card",
      })
    ).resolves.toEqual({ supported: true });
  });

  it("refuse le mode chèque", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 12_000,
      paymentMethod: "cheque",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("Chèque");
  });

  it("refuse les chèques vacances", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 12_000,
      paymentMethod: "holiday_vouchers",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("Chèques vacances");
  });

  it("refuse un montant nul", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 0,
      paymentMethod: "card",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("montant");
  });
});
