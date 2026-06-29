import type { PaymentAid } from "@/lib/club-registration/payment/types";
import {
  assertStripePayableAfterDiscounts,
  buildMergedCheckoutDiscountCouponName,
  computeSecretariatAidDiscountCents,
  sumPaymentAidDiscountCents,
} from "./stripe-checkout-discounts";

describe("stripe-checkout-discounts", () => {
  it("calcule la remise aides secrétariat", () => {
    expect(computeSecretariatAidDiscountCents(27_500, 22_500)).toBe(5_000);
    expect(computeSecretariatAidDiscountCents(20_000, 20_000)).toBe(0);
  });

  it("valide le net après remise don (déjà dans la facture) et aides", () => {
    expect(() =>
      assertStripePayableAfterDiscounts({
        invoiceTotalCents: 37_400,
        donationDiscountCents: 5_000,
        aidDiscountCents: 2_000,
        amountToPayCents: 35_400,
      })
    ).not.toThrow();
  });

  it("valide le net sans aide secrétariat", () => {
    expect(() =>
      assertStripePayableAfterDiscounts({
        invoiceTotalCents: 27_500,
        donationDiscountCents: 2_500,
        aidDiscountCents: 0,
        amountToPayCents: 27_500,
      })
    ).not.toThrow();
  });

  it("rejette une incohérence montant / remises", () => {
    expect(() =>
      assertStripePayableAfterDiscounts({
        invoiceTotalCents: 37_400,
        donationDiscountCents: 5_000,
        aidDiscountCents: 2_000,
        amountToPayCents: 30_400,
      })
    ).toThrow("Incohérence montant Stripe");
  });

  it("fusionne remise don et aides en un libellé coupon", () => {
    expect(
      buildMergedCheckoutDiscountCouponName({
        donationDiscountCents: 5_000,
        donationDiscountCouponName: "Remise don libre",
        aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 2_000 }],
      })
    ).toBe("Remise don libre + Pass Sport");
  });

  it("somme les aides", () => {
    const aids: PaymentAid[] = [
      { type: "pass_sport", label: "Pass Sport", amountCents: 5_000 },
      { type: "labaz", label: "Labaz", amountCents: 0 },
    ];
    expect(sumPaymentAidDiscountCents(aids)).toBe(5_000);
  });
});
