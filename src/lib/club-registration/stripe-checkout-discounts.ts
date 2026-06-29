import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { createAmountOffCheckoutCoupon } from "@/lib/club-registration/stripe";

const STRIPE_COUPON_NAME_MAX = 40;

function truncateCouponName(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= STRIPE_COUPON_NAME_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, STRIPE_COUPON_NAME_MAX - 1)}…`;
}

/** Libellé du coupon unique (Checkout Stripe : 1 seul coupon autorisé par session). */
export function buildMergedCheckoutDiscountCouponName(params: {
  donationDiscountCents: number;
  donationDiscountCouponName: string;
  aids: PaymentAid[];
}): string {
  const activeAids = params.aids.filter((aid) => aid.amountCents > 0);
  const hasDonation = params.donationDiscountCents > 0;

  if (hasDonation && activeAids.length === 0) {
    return params.donationDiscountCouponName;
  }
  if (!hasDonation && activeAids.length === 1) {
    return activeAids[0]!.label;
  }
  if (!hasDonation && activeAids.length > 1) {
    return "Remises aides secrétariat";
  }
  if (hasDonation && activeAids.length === 1) {
    return `${params.donationDiscountCouponName} + ${activeAids[0]!.label}`;
  }
  return "Remises adhésion";
}

/** Montant total des coupons « aides secrétariat » à appliquer sur la facture. */
export function computeSecretariatAidDiscountCents(
  invoiceTotalCents: number,
  amountToPayCents: number
): number {
  return Math.max(0, invoiceTotalCents - amountToPayCents);
}

export function sumPaymentAidDiscountCents(aids: PaymentAid[]): number {
  return aids.reduce((sum, aid) => sum + Math.max(0, aid.amountCents), 0);
}

/**
 * Vérifie que le reste à payer correspond au net Stripe attendu.
 *
 * `invoiceTotalCents` = catalogue + don − remise don (déjà net de la remise don).
 * Seules les aides secrétariat réduisent encore le montant encaissé ; la remise don
 * est un coupon Stripe distinct mais déjà reflétée dans `invoiceTotalCents`.
 */
export function assertStripePayableAfterDiscounts(params: {
  invoiceTotalCents: number;
  donationDiscountCents: number;
  aidDiscountCents: number;
  amountToPayCents: number;
}): void {
  void params.donationDiscountCents;
  const expectedPayable = params.invoiceTotalCents - params.aidDiscountCents;
  if (expectedPayable !== params.amountToPayCents) {
    throw new Error(
      `Incohérence montant Stripe : facture ${params.invoiceTotalCents} cts, aides ${params.aidDiscountCents} cts, attendu ${params.amountToPayCents} cts, calculé ${expectedPayable} cts`
    );
  }
}

/**
 * Crée le coupon Stripe de remise (un seul : limite API Checkout).
 * Remise don + aides secrétariat sont fusionnées ; le détail figure sur la facture
 * (champs personnalisés).
 */
export async function createCheckoutDiscountCouponIds(params: {
  registrationId: string;
  donationDiscountCents: number;
  donationDiscountCouponName: string;
  aids: PaymentAid[];
}): Promise<string[]> {
  const aidTotal = sumPaymentAidDiscountCents(params.aids);
  const donationDiscount = Math.max(0, params.donationDiscountCents);
  const totalOff = donationDiscount + aidTotal;

  if (totalOff <= 0) {
    return [];
  }

  const couponId = await createAmountOffCheckoutCoupon({
    registrationId: params.registrationId,
    amountOffCents: totalOff,
    name: truncateCouponName(
      buildMergedCheckoutDiscountCouponName({
        donationDiscountCents: donationDiscount,
        donationDiscountCouponName: params.donationDiscountCouponName,
        aids: params.aids,
      })
    ),
    kind: "merged_checkout_discount",
  });

  return [couponId];
}
