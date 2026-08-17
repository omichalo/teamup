import { managerPaymentAidPayloadSchema, paymentAidPayloadSchema } from "./payment-payload-schema";

describe("paymentAidPayloadSchema", () => {
  it("ignore received à la soumission famille", () => {
    const parsed = paymentAidPayloadSchema.parse({
      type: "pass_sport",
      label: "Pass Sport",
      amountCents: 5_000,
      received: true,
      receivedAt: "2026-08-01T00:00:00.000Z",
      receivedBy: "uid-family",
    });
    expect(parsed).toEqual({
      type: "pass_sport",
      label: "Pass Sport",
      amountCents: 5_000,
    });
  });

  it("accepte received côté secrétariat sans receivedAt/receivedBy", () => {
    const parsed = managerPaymentAidPayloadSchema.parse({
      type: "pass_sport",
      label: "Pass Sport",
      amountCents: 5_000,
      received: true,
      receivedBy: "uid-spoof",
    });
    expect(parsed.received).toBe(true);
    expect("receivedBy" in parsed).toBe(false);
  });
});
