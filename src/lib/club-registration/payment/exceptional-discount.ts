import type { PaymentAid } from "./types";
import { findPaymentAid, removePaymentAid, upsertPaymentAid } from "./payment-draft-helpers";

/** Type d’aide secrétariat pour une remise ad hoc (hors catalogue des aides déclarées). */
export const EXCEPTIONAL_DISCOUNT_AID_TYPE = "other" as const;

export const EXCEPTIONAL_DISCOUNT_AID_LABEL = "Remise exceptionnelle";

export function isExceptionalDiscountAidType(type: string): boolean {
  return type === EXCEPTIONAL_DISCOUNT_AID_TYPE;
}

export function exceptionalDiscountAidLabel(type: string, fallbackLabel?: string): string {
  if (isExceptionalDiscountAidType(type)) {
    return EXCEPTIONAL_DISCOUNT_AID_LABEL;
  }
  return fallbackLabel?.trim() || type;
}

export function findExceptionalDiscountAid(aids: PaymentAid[]): PaymentAid | undefined {
  return findPaymentAid(aids, EXCEPTIONAL_DISCOUNT_AID_TYPE);
}

export function upsertExceptionalDiscountAid(
  aids: PaymentAid[],
  patch: { amountCents: number; note?: string },
  options?: { retainZero?: boolean }
): PaymentAid[] {
  return upsertPaymentAid(
    aids,
    {
      type: EXCEPTIONAL_DISCOUNT_AID_TYPE,
      label: EXCEPTIONAL_DISCOUNT_AID_LABEL,
      amountCents: patch.amountCents,
      ...(patch.note != null && patch.note.length > 0 ? { note: patch.note } : {}),
    },
    options
  );
}

export function removeExceptionalDiscountAid(aids: PaymentAid[]): PaymentAid[] {
  return removePaymentAid(aids, EXCEPTIONAL_DISCOUNT_AID_TYPE);
}
