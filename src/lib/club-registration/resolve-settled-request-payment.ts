import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { paymentToFirestoreUpdate } from "@/lib/club-registration/payment/normalize-payment";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";

export const ALREADY_PAID_RESEND_ERROR =
  "Ce dossier est déjà réglé (paiement enregistré). Impossible de renvoyer un lien de paiement.";

export const ALREADY_FINALIZED_NO_LINK_MESSAGE =
  "Dossier déjà réglé. Aucun lien de paiement n'a été renvoyé.";

export const VALIDATED_ALREADY_PAID_MESSAGE =
  "Dossier validé. Le paiement était déjà enregistré, aucun lien de paiement n'a été envoyé.";

export function isRegistrationPaymentSettled(
  data: Record<string, unknown>,
  payment?: Pick<
    RegistrationPayment,
    "paymentStatus" | "remainingAmountCents" | "paidAmountCents"
  > | null
): boolean {
  if (isRegistrationPaidRecord(data)) {
    return true;
  }
  if (payment?.paymentStatus === "paid") {
    return true;
  }
  return (payment?.paidAmountCents ?? 0) > 0 && (payment?.remainingAmountCents ?? 1) <= 0;
}

export type SettledRequestPaymentAction =
  | { kind: "already_finalized"; message: string }
  | { kind: "finalize_paid"; message: string }
  | { kind: "reject"; error: string };

export function resolveSettledRequestPaymentAction(
  dossierStatus: unknown
): SettledRequestPaymentAction {
  if (dossierStatus === "rejected") {
    return { kind: "reject", error: ALREADY_PAID_RESEND_ERROR };
  }
  if (dossierStatus === "paid" || dossierStatus === "approved") {
    return { kind: "already_finalized", message: ALREADY_FINALIZED_NO_LINK_MESSAGE };
  }
  return { kind: "finalize_paid", message: VALIDATED_ALREADY_PAID_MESSAGE };
}

export function buildPaidDossierValidationPatch(
  payment: RegistrationPayment | null
): Record<string, unknown> {
  return {
    status: "paid",
    ...(payment ? paymentToFirestoreUpdate(payment) : {}),
  };
}
