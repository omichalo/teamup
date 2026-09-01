import type { RegistrationPayment } from "./types";
import {
  isJerseyRequested,
  normalizeJerseyFollowUpStatus,
  type JerseyFollowUpStatus,
} from "../jersey-follow-up";

type PaymentBalance = Pick<
  RegistrationPayment,
  "remainingAmountCents" | "paidAmountCents" | "paymentStatus"
>;

/** Solde encore dû (tous moyens confondus). */
export function hasRegistrationOutstandingBalance(
  payment?: Pick<RegistrationPayment, "remainingAmountCents" | "paymentStatus"> | null
): boolean {
  if (!payment) {
    return false;
  }
  if (payment.remainingAmountCents > 0) {
    return true;
  }
  return payment.paymentStatus === "partially_paid";
}

/** Complément après au moins un encaissement (ex. option ajoutée post-paiement CB). */
export function isRegistrationSupplementDue(payment?: PaymentBalance | null): boolean {
  if (!payment) {
    return false;
  }
  return payment.paidAmountCents > 0 && payment.remainingAmountCents > 0;
}

/** Maillot préparé en attente de paiement quand un complément apparaît. */
export function resolveJerseyFollowUpForSupplement(params: {
  wantsCompetitorExtras: unknown;
  wantsOptionalJersey: unknown;
  currentStatus: unknown;
}): JerseyFollowUpStatus | undefined {
  if (!isJerseyRequested(params.wantsCompetitorExtras, params.wantsOptionalJersey)) {
    return undefined;
  }
  const current = normalizeJerseyFollowUpStatus(
    params.currentStatus,
    params.wantsCompetitorExtras,
    params.wantsOptionalJersey
  );
  if (current === "given" || current === "prepared_awaiting_payment") {
    return undefined;
  }
  return "prepared_awaiting_payment";
}

