import { createStripePaymentForRegistration } from "@/lib/club-registration/stripe";

describe("createStripePaymentForRegistration", () => {
  it("autorise Stripe pour carte en une fois", async () => {
    await expect(
      createStripePaymentForRegistration({
        registrationId: "reg_1",
        amountToPayCents: 12000,
        installments: 1,
        paymentMethod: "card",
      })
    ).resolves.toEqual({ supported: true });
  });

  it("refuse les échéances multiples", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 12000,
      installments: 3,
      paymentMethod: "card",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("plusieurs fois");
  });

  it("refuse le mode chèque", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 12000,
      installments: 1,
      paymentMethod: "cheque",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("Chèque");
  });

  it("refuse les chèques vacances", async () => {
    const result = await createStripePaymentForRegistration({
      registrationId: "reg_1",
      amountToPayCents: 12000,
      installments: 1,
      paymentMethod: "holiday_vouchers",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("Chèques vacances");
  });
});
