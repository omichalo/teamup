import { FieldValue, type DocumentReference, type DocumentData } from "firebase-admin/firestore";
import {
  buildPaymentRequestEmail,
  buildPaymentRequestEmailSubject,
} from "@/lib/email/payment-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  assertStripePayableAfterDiscounts,
  computeSecretariatAidDiscountCents,
  sumPaymentAidDiscountCents,
} from "@/lib/club-registration/stripe-checkout-discounts";
import { paymentToFirestoreUpdate } from "@/lib/club-registration/payment/normalize-payment";
import { recalculateRegistrationPayment } from "@/lib/club-registration/payment/payment-mutations";
import {
  assertStripeLinesMatchQuote,
  buildStripeCheckoutLineItems,
} from "@/lib/pricing/stripe-checkout-lines";
import type { DonationPricingBreakdown } from "@/lib/pricing/donation-discount";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import type { PriceQuote } from "@/lib/pricing/types";

export function validateRegistrationStripeCheckout(params: {
  quote: PriceQuote | null;
  donationPricing: DonationPricingBreakdown | null;
  pricingConfig: RegistrationConfigV1;
  payment: RegistrationPayment | null;
  amountToPayCents: number;
}):
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> } {
  const useQuoteLineItems =
    params.quote != null &&
    params.donationPricing != null &&
    params.donationPricing.invoiceTotalCents > 0;

  if (!useQuoteLineItems || !params.quote || !params.donationPricing) {
    return { ok: true };
  }

  const { quote, donationPricing } = params;
  const stripePresentation = params.pricingConfig.stripePresentation;
  const donationContext =
    donationPricing.voluntaryDonationCents > 0
      ? {
          voluntaryDonationCents: donationPricing.voluntaryDonationCents,
          donationDiscountCents: donationPricing.donationDiscountCents,
        }
      : undefined;
  const stripeLineItems = buildStripeCheckoutLineItems(
    quote,
    stripePresentation,
    donationContext
  );
  const paymentAids = params.payment?.aids ?? [];
  assertStripeLinesMatchQuote(quote, stripeLineItems, donationContext);

  const aidDiscountCents = sumPaymentAidDiscountCents(paymentAids);
  const expectedAidDiscount = computeSecretariatAidDiscountCents(
    donationPricing.invoiceTotalCents,
    params.amountToPayCents
  );
  if (aidDiscountCents !== expectedAidDiscount) {
    return {
      ok: false,
      status: 400,
      body: {
        error:
          "Les aides enregistrées ne correspondent pas au reste à payer. Enregistrez le dossier ou alignez le montant.",
        expectedAidDiscountCents: expectedAidDiscount,
        recordedAidDiscountCents: aidDiscountCents,
      },
    };
  }

  try {
    assertStripePayableAfterDiscounts({
      invoiceTotalCents: donationPricing.invoiceTotalCents,
      donationDiscountCents: donationPricing.donationDiscountCents,
      aidDiscountCents,
      amountToPayCents: params.amountToPayCents,
    });
  } catch (validationError) {
    return {
      ok: false,
      status: 400,
      body: {
        error:
          validationError instanceof Error
            ? validationError.message
            : "Incohérence montant / remises pour Stripe.",
      },
    };
  }

  return { ok: true };
}

export function buildPaymentRequestedFirestoreUpdate(params: {
  payment: RegistrationPayment | null;
  quote: PriceQuote | null;
  donationPricing: DonationPricingBreakdown | null;
  amountToPayCents: number;
  requestedByUid: string;
  paymentEmail: string;
}): DocumentData {
  const waitingPayment = params.payment
    ? recalculateRegistrationPayment({
        ...params.payment,
        paymentStatus: "waiting_payment",
      })
    : null;

  const hasValidatedQuote =
    params.quote != null &&
    params.donationPricing != null &&
    params.donationPricing.invoiceTotalCents > 0;

  const firestoreUpdate: DocumentData = {
    status: "payment_requested",
    ...(waitingPayment ? paymentToFirestoreUpdate(waitingPayment) : {}),
    paymentAmountCents: params.amountToPayCents,
    paymentStatus: "pending",
    paymentRequestedAt: FieldValue.serverTimestamp(),
    paymentRequestedBy: params.requestedByUid,
    paymentEmailSentTo: params.paymentEmail,
    stripeCheckoutSessionId: FieldValue.delete(),
    stripeCheckoutUrl: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (hasValidatedQuote && params.quote && params.donationPricing) {
    firestoreUpdate.pricingQuote = params.quote;
    firestoreUpdate.pricingQuoteStatus = "validated";
    firestoreUpdate.voluntaryDonationCents = params.donationPricing.voluntaryDonationCents;
    firestoreUpdate.donationDiscountCents = params.donationPricing.donationDiscountCents;
  }

  return firestoreUpdate;
}

export async function persistPaymentRequestedAndNotify(params: {
  docRef: DocumentReference;
  registrationId: string;
  payment: RegistrationPayment | null;
  quote: PriceQuote | null;
  donationPricing: DonationPricingBreakdown | null;
  amountToPayCents: number;
  paymentEmail: string;
  adherentName: string;
  baseUrl: string;
  requestedByUid: string;
  isResend?: boolean;
}): Promise<void> {
  await params.docRef.set(
    buildPaymentRequestedFirestoreUpdate({
      payment: params.payment,
      quote: params.quote,
      donationPricing: params.donationPricing,
      amountToPayCents: params.amountToPayCents,
      requestedByUid: params.requestedByUid,
      paymentEmail: params.paymentEmail,
    }),
    { merge: true }
  );

  const hasValidatedQuote =
    params.quote != null &&
    params.donationPricing != null &&
    params.donationPricing.invoiceTotalCents > 0;
  const emailVariant = params.isResend ? "resend" : "initial";
  const paymentMail = buildPaymentRequestEmail({
    registrationId: params.registrationId,
    adherentName: params.adherentName,
    amountCents: params.amountToPayCents,
    appOrigin: params.baseUrl,
    quote: hasValidatedQuote ? params.quote : null,
    donationPricing: hasValidatedQuote ? params.donationPricing : null,
    variant: emailVariant,
    ...(params.payment?.aids?.length ? { secretariatAids: params.payment.aids } : {}),
  });

  await sendMail({
    to: params.paymentEmail,
    subject: buildPaymentRequestEmailSubject(params.adherentName, emailVariant),
    text: paymentMail.text,
    html: paymentMail.html,
    attachments: [getSqyPingLogoAttachment()],
  });

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_REQUESTED, params.requestedByUid, {
    resource: "clubRegistration",
    resourceId: params.registrationId,
    details: {
      amountCents: params.amountToPayCents,
      resend: Boolean(params.isResend),
      paymentHub: "mes_inscriptions",
      ...(hasValidatedQuote
        ? {
            catalogVersion: params.quote?.catalogVersion,
            donationCents: params.donationPricing?.voluntaryDonationCents ?? 0,
            donationDiscountCents: params.donationPricing?.donationDiscountCents ?? 0,
          }
        : { legacy: true }),
    },
    success: true,
  });
}
