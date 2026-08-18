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
  alreadyPaidCents?: number;
}): string {
  const activeAids = params.aids.filter((aid) => aid.amountCents > 0);
  const hasDonation = params.donationDiscountCents > 0;
  const hasAlreadyPaid = (params.alreadyPaidCents ?? 0) > 0;

  if (hasAlreadyPaid && !hasDonation && activeAids.length === 0) {
    return "Déjà encaissé";
  }

  if (hasDonation && activeAids.length === 0 && !hasAlreadyPaid) {
    return params.donationDiscountCouponName;
  }
  if (!hasDonation && activeAids.length === 1 && !hasAlreadyPaid) {
    return activeAids[0]!.label;
  }
  if (!hasDonation && activeAids.length > 1 && !hasAlreadyPaid) {
    return "Remises aides secrétariat";
  }
  if (hasDonation && activeAids.length === 1 && !hasAlreadyPaid) {
    return `${params.donationDiscountCouponName} + ${activeAids[0]!.label}`;
  }
  return "Remises adhésion";
}

export function sumCheckoutDiscountCents(params: {
  donationDiscountCents: number;
  aids: PaymentAid[];
  alreadyPaidCents?: number;
}): number {
  return (
    Math.max(0, params.donationDiscountCents) +
    sumPaymentAidDiscountCents(params.aids) +
    Math.max(0, params.alreadyPaidCents ?? 0)
  );
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
  alreadyPaidCents?: number;
  remainingPayableCents?: number;
}): void {
  void params.donationDiscountCents;
  const expectedPayable = params.invoiceTotalCents - params.aidDiscountCents;
  if (expectedPayable !== params.amountToPayCents) {
    throw new Error(
      `Incohérence montant Stripe : facture ${params.invoiceTotalCents} cts, aides ${params.aidDiscountCents} cts, attendu ${params.amountToPayCents} cts, calculé ${expectedPayable} cts`
    );
  }

  if (params.remainingPayableCents != null) {
    const alreadyPaid = Math.max(0, params.alreadyPaidCents ?? 0);
    const expectedRemaining = Math.max(0, params.amountToPayCents - alreadyPaid);
    if (expectedRemaining !== params.remainingPayableCents) {
      throw new Error(
        `Incohérence solde Stripe : net ${params.amountToPayCents} cts, déjà encaissé ${alreadyPaid} cts, attendu ${params.remainingPayableCents} cts, calculé ${expectedRemaining} cts`
      );
    }
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
  alreadyPaidCents?: number;
}): Promise<string[]> {
  const donationDiscount = Math.max(0, params.donationDiscountCents);
  const alreadyPaidCents = Math.max(0, params.alreadyPaidCents ?? 0);
  const totalOff = sumCheckoutDiscountCents({
    donationDiscountCents: donationDiscount,
    aids: params.aids,
    alreadyPaidCents,
  });

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
        alreadyPaidCents,
      })
    ),
    kind: "merged_checkout_discount",
  });

  return [couponId];
}
