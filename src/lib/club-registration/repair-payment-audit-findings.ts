import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "./payment/normalize-payment";
import {
  CANCELLED_EXPECTED_REPLACED_NOTE,
  cancelOutstandingExpectedPayments,
  recalculateRegistrationPayment,
} from "./payment/payment-mutations";
import type { RegistrationPayment } from "./payment/types";

export type PaymentAuditRepairKind =
  | "clear_paid_at_with_balance"
  | "cancel_ghost_cheque_plan"
  | "align_holiday_voucher_declared"
  | "sync_root_payment_status";

export type PaymentAuditRepairPlan = {
  kinds: PaymentAuditRepairKind[];
  /** Patch Firestore (`paidAt: null` → `FieldValue.delete()` côté script admin). */
  patch: Record<string, unknown>;
  summary: string[];
};

function sumActiveHolidayVoucherReceivedCents(payment: RegistrationPayment): number {
  return payment.receivedPayments.reduce((sum, line) => {
    if (line.method !== "holiday_vouchers" || line.reversedAt) {
      return sum;
    }
    return sum + Math.max(0, line.amountCents);
  }, 0);
}

function expectedRootPaymentStatus(payment: RegistrationPayment): unknown {
  return paymentToFirestoreUpdate(payment).paymentStatus;
}

function hasPendingChequeExpected(payment: RegistrationPayment): boolean {
  return payment.expectedPayments.some((line) => line.status === "expected");
}

function nestedPaymentNeedsRewrite(
  data: Record<string, unknown>,
  payment: RegistrationPayment
): boolean {
  const raw = data.payment;
  if (typeof raw !== "object" || raw === null) {
    return true;
  }
  const nested = raw as RegistrationPayment;
  return (
    nested.paidAmountCents !== payment.paidAmountCents ||
    nested.remainingAmountCents !== payment.remainingAmountCents ||
    nested.paymentStatus !== payment.paymentStatus ||
    nested.holidayVoucherAmountCents !== payment.holidayVoucherAmountCents ||
    JSON.stringify(nested.expectedPayments ?? []) !==
      JSON.stringify(payment.expectedPayments)
  );
}

/**
 * Construit le patch de réparation pour les constats d'audit paiement (points 2–5).
 */
export function buildPaymentAuditRepairPlan(
  data: Record<string, unknown>
): PaymentAuditRepairPlan | null {
  const initial = normalizeRegistrationPayment(data);
  if (!initial) {
    return null;
  }

  let payment = recalculateRegistrationPayment(initial, {
    preserveManualFollowUp: true,
  });
  const kinds: PaymentAuditRepairKind[] = [];
  const summary: string[] = [];
  const patch: Record<string, unknown> = {};

  // Point 2 — paidAt (ou status paid/approved) avec reliquat
  const hasBalance = payment.remainingAmountCents > 0;
  const hasPaidAt = data.paidAt != null;
  const status = typeof data.status === "string" ? data.status : null;
  if (hasBalance && (hasPaidAt || status === "paid" || status === "approved")) {
    kinds.push("clear_paid_at_with_balance");
    if (hasPaidAt) {
      patch.paidAt = null;
      summary.push("suppression paidAt (reliquat dû)");
    }
    if (status === "paid" || status === "approved") {
      patch.status = "payment_requested";
      summary.push(`status ${status} → payment_requested`);
    }
  }

  // Point 3 — échéances chèque encore « expected » sur dossier soldé
  if (payment.remainingAmountCents === 0 && hasPendingChequeExpected(payment)) {
    const next = cancelOutstandingExpectedPayments(
      payment,
      CANCELLED_EXPECTED_REPLACED_NOTE
    );
    if (next !== payment) {
      payment = next;
      kinds.push("cancel_ghost_cheque_plan");
      summary.push("annulation échéances chèque encore expected (solde 0)");
    }
  }

  // Point 4 — déclaration CV ≠ encaissements CV sur dossier soldé
  if (
    payment.remainingAmountCents === 0 &&
    typeof payment.holidayVoucherAmountCents === "number"
  ) {
    const receivedHv = sumActiveHolidayVoucherReceivedCents(payment);
    if (payment.holidayVoucherAmountCents !== receivedHv) {
      payment = {
        ...payment,
        holidayVoucherAmountCents: receivedHv,
      };
      kinds.push("align_holiday_voucher_declared");
      summary.push(
        `holidayVoucherAmountCents ${initial.holidayVoucherAmountCents} → ${receivedHv}`
      );
    }
  }

  const rootStatus = data.paymentStatus;
  const expectedRoot = expectedRootPaymentStatus(payment);
  const rootMismatch = rootStatus !== expectedRoot;
  const nestedMismatch = nestedPaymentNeedsRewrite(data, payment);
  const amountMismatch = data.paymentAmountCents !== payment.amountToPayCents;

  const needsPaymentWrite =
    kinds.length > 0 || rootMismatch || nestedMismatch || amountMismatch;

  if (!needsPaymentWrite) {
    return null;
  }

  if (rootMismatch || (kinds.length === 0 && (nestedMismatch || amountMismatch))) {
    if (!kinds.includes("sync_root_payment_status")) {
      kinds.push("sync_root_payment_status");
    }
    if (rootMismatch) {
      summary.push(
        `paymentStatus racine ${String(rootStatus)} → ${String(expectedRoot)}`
      );
    } else {
      summary.push("réécriture payment (totaux / nested)");
    }
  }

  Object.assign(patch, paymentToFirestoreUpdate(payment));

  return {
    kinds: [...new Set(kinds)],
    patch,
    summary: [...new Set(summary)],
  };
}
