import type { PaymentMethodId } from "@/lib/club-registration/payment-constants";
import {
  BNPL_SECRETARIAT_PAYMENT_TOOLTIP,
  SECRETARIAT_INITIAL_PAYMENT_BUTTON,
  SECRETARIAT_REQUEST_SUPPLEMENT_BUTTON,
  SECRETARIAT_REQUEST_SUPPLEMENT_TOOLTIP,
  SECRETARIAT_RESEND_PAYMENT_BUTTON,
  SECRETARIAT_RESEND_PAYMENT_TOOLTIP,
  SECRETARIAT_VALIDATE_SETTLED_BUTTON,
  SECRETARIAT_VALIDATE_SETTLED_TOOLTIP,
} from "./bnpl-checkout-copy";
import { isRegistrationSupplementDue } from "./registration-supplement";

export type SecretariatPaymentCta =
  | { visible: false }
  | {
      visible: true;
      label: string;
      tooltip: string;
      kind: "request" | "resend" | "validate_settled" | "supplement";
    };

export function resolveSecretariatPaymentCta(params: {
  registrationStatus?: string | null | undefined;
  paymentSettled: boolean;
  paymentMethod?: PaymentMethodId | null | undefined;
  remainingAmountCents?: number | null;
  paidAmountCents?: number | null;
}): SecretariatPaymentCta {
  const status = params.registrationStatus ?? null;
  const remaining = Math.max(0, params.remainingAmountCents ?? 0);
  const paid = Math.max(0, params.paidAmountCents ?? 0);
  const supplementDue =
    !params.paymentSettled &&
    isRegistrationSupplementDue({
      remainingAmountCents: remaining,
      paidAmountCents: paid,
      paymentStatus: "partially_paid",
    });

  if ((status === "paid" || status === "approved") && !supplementDue) {
    return { visible: false };
  }

  const canSendStripeEmail = params.paymentMethod === "card";

  if (supplementDue && (status === "paid" || status === "approved" || status === "payment_requested")) {
    return {
      visible: true,
      label: canSendStripeEmail
        ? SECRETARIAT_REQUEST_SUPPLEMENT_BUTTON
        : "Renvoyer les instructions de règlement",
      tooltip: canSendStripeEmail
        ? SECRETARIAT_REQUEST_SUPPLEMENT_TOOLTIP
        : "Renvoie l'e-mail d'instructions de règlement pour le complément dû.",
      kind: "supplement",
    };
  }

  if (params.paymentSettled) {
    return {
      visible: true,
      label: SECRETARIAT_VALIDATE_SETTLED_BUTTON,
      tooltip: SECRETARIAT_VALIDATE_SETTLED_TOOLTIP,
      kind: "validate_settled",
    };
  }

  if (status === "payment_requested") {
    return {
      visible: true,
      label: canSendStripeEmail
        ? SECRETARIAT_RESEND_PAYMENT_BUTTON
        : "Renvoyer les instructions de règlement",
      tooltip: canSendStripeEmail
        ? SECRETARIAT_RESEND_PAYMENT_TOOLTIP
        : "Renvoie l'e-mail d'instructions de règlement au contact du dossier.",
      kind: "resend",
    };
  }

  return {
    visible: true,
    label: SECRETARIAT_INITIAL_PAYMENT_BUTTON,
    tooltip: canSendStripeEmail
      ? BNPL_SECRETARIAT_PAYMENT_TOOLTIP
      : "Enregistre le dossier puis envoie les instructions de règlement prévues. Un lien de paiement en ligne peut être envoyé séparément.",
    kind: "request",
  };
}
