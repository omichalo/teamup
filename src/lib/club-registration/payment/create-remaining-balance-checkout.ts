import { createLegacySingleLineCheckoutSession } from "@/lib/club-registration/stripe";
import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { cancelAllPendingExpectedPayments } from "@/lib/club-registration/payment/payment-mutations";

/** Metadata Stripe — Checkout du reste dû après encaissements partiels. */
export const REMAINING_BALANCE_CHECKOUT_KIND = "remaining_balance";

export const REMAINING_BALANCE_EXPECTED_CANCEL_NOTE =
  "Échéance annulée : solde demandé par lien carte bancaire";

export type RemainingCardGateResult =
  | { ok: true; remainingAmountCents: number }
  | { ok: false; error: string };

export function assertCanRequestRemainingCardPayment(params: {
  payment: RegistrationPayment | null;
  registrationData: Record<string, unknown>;
}): RemainingCardGateResult {
  if (isRegistrationPaidRecord(params.registrationData)) {
    return { ok: false, error: "Ce dossier est déjà marqué comme payé." };
  }
  if (!params.payment) {
    return { ok: false, error: "Aucune donnée de paiement sur ce dossier." };
  }
  if (params.payment.paymentStatus === "paid") {
    return { ok: false, error: "Ce dossier est déjà marqué comme payé." };
  }
  if (params.payment.paidAmountCents <= 0) {
    return {
      ok: false,
      error:
        "Enregistrez d’abord au moins un encaissement partiel, puis renvoyez un lien CB pour le reste dû.",
    };
  }
  if (params.payment.remainingAmountCents <= 0) {
    return { ok: false, error: "Aucun reste dû à régler par carte." };
  }
  return { ok: true, remainingAmountCents: params.payment.remainingAmountCents };
}

export function preparePaymentForRemainingCardCheckout(
  payment: RegistrationPayment
): RegistrationPayment {
  const withoutPending = cancelAllPendingExpectedPayments(
    payment,
    REMAINING_BALANCE_EXPECTED_CANCEL_NOTE
  );
  return {
    ...withoutPending,
    paymentStatus:
      withoutPending.paymentStatus === "paid"
        ? withoutPending.paymentStatus
        : "waiting_payment",
  };
}

export async function createRemainingBalanceCheckoutSession(params: {
  registrationId: string;
  remainingAmountCents: number;
  customerEmail: string;
  adherentName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null }> {
  if (params.remainingAmountCents <= 0) {
    throw new Error("Montant du solde invalide.");
  }

  const session = await createLegacySingleLineCheckoutSession({
    registrationId: params.registrationId,
    amountCents: params.remainingAmountCents,
    customerEmail: params.customerEmail,
    adherentName: params.adherentName,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    lineItemName: "Solde adhésion SQY Ping",
    lineItemDescription: `Solde dossier ${params.registrationId}`,
    invoiceDescription: `Solde adhésion SQY Ping — ${params.adherentName}`,
    extraMetadata: {
      checkoutKind: REMAINING_BALANCE_CHECKOUT_KIND,
      expectedAmountCents: String(params.remainingAmountCents),
    },
  });

  return { id: session.id, url: session.url };
}
