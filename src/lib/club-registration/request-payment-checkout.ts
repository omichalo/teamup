import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { buildPaymentInstructionsEmail } from "@/lib/email/payment-instructions-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  createLegacySingleLineCheckoutSession,
  createMembershipCheckoutSession,
} from "@/lib/club-registration/stripe";
import {
  createCheckoutDiscountCouponIds,
  sumPaymentAidDiscountCents,
} from "@/lib/club-registration/stripe-checkout-discounts";
import {
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import {
  recalculateRegistrationPayment,
  regenerateExpectedPayments,
  setManualFollowUp,
} from "@/lib/club-registration/payment/payment-mutations";
import { renderInvoiceHeader } from "@/lib/club-registration-config/helpers";
import { hashPriceQuote } from "@/lib/pricing/quote-hash";
import {
  buildStripeCheckoutLineItems,
  buildStripeInvoiceCustomFields,
} from "@/lib/pricing/stripe-checkout-lines";
import { validateRegistrationStripeCheckout } from "@/lib/club-registration/payment-requested";
import type { DonationPricingBreakdown } from "@/lib/pricing/donation-discount";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { formatRegistrationPaymentEmailsForStorage } from "@/lib/club-registration/resolve-registration-contact-email";
import type { PriceQuote } from "@/lib/pricing/types";

export {
  buildPaymentRequestedFirestoreUpdate,
  persistPaymentRequestedAndNotify,
  validateRegistrationStripeCheckout,
} from "@/lib/club-registration/payment-requested";

export type StripeCheckoutSessionResult = {
  session: { id: string; url: string | null };
  legacy: boolean;
  stripeLineItems?: ReturnType<typeof buildStripeCheckoutLineItems>;
  aidDiscountCents?: number;
};

export async function processManualPaymentFollowUp(params: {
  docRef: DocumentReference;
  registrationId: string;
  payment: RegistrationPayment | null;
  quote: PriceQuote | null;
  donationPricing: DonationPricingBreakdown | null;
  amountToPayCents: number;
  paymentMethod: RegistrationPayment["paymentMethod"];
  paymentEmails: string[];
  adherentName: string;
  baseUrl: string;
  requestedByUid: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const paymentInstallments = params.payment?.paymentInstallments ?? 1;
  const baseManualPayment: RegistrationPayment =
    params.payment ??
    ({
      totalAmountCents: params.quote?.totalCents ?? params.amountToPayCents,
      assistanceTotalAmountCents: 0,
      amountToPayCents: params.amountToPayCents,
      aids: [],
      paymentMethod: params.paymentMethod,
      paymentInstallments,
      expectedPayments: [],
      receivedPayments: [],
      paidAmountCents: 0,
      remainingAmountCents: params.amountToPayCents,
      paymentStatus: "waiting_payment",
    } satisfies RegistrationPayment);

  const manualPayment = setManualFollowUp(baseManualPayment);

  await params.docRef.set(
    {
      status: "payment_requested",
      ...paymentToFirestoreUpdate(manualPayment),
      paymentAmountCents: params.amountToPayCents,
      voluntaryDonationCents: params.donationPricing?.voluntaryDonationCents ?? 0,
      donationDiscountCents: params.donationPricing?.donationDiscountCents ?? 0,
      paymentRequestedAt: FieldValue.serverTimestamp(),
      paymentRequestedBy: params.requestedByUid,
      paymentEmailSentTo: formatRegistrationPaymentEmailsForStorage(params.paymentEmails),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const instructionsMail = buildPaymentInstructionsEmail({
    adherentName: params.adherentName,
    amountCents: params.amountToPayCents,
    registrationId: params.registrationId,
    appOrigin: params.baseUrl,
    paymentMethod: manualPayment.paymentMethod,
    paymentInstallments: manualPayment.paymentInstallments,
    expectedPayments: manualPayment.expectedPayments,
    donationPricing: params.donationPricing,
    ...(manualPayment.holidayVoucherAmountCents != null
      ? { holidayVoucherAmountCents: manualPayment.holidayVoucherAmountCents }
      : {}),
    ...(manualPayment.remainingPaymentMethod
      ? { remainingPaymentMethod: manualPayment.remainingPaymentMethod }
      : {}),
    ...(manualPayment.specialPaymentNote
      ? { specialPaymentNote: manualPayment.specialPaymentNote }
      : {}),
    ...(manualPayment.paymentNote ? { paymentNote: manualPayment.paymentNote } : {}),
    quote: params.quote,
    ...(manualPayment.aids.length > 0 ? { secretariatAids: manualPayment.aids } : {}),
  });

  try {
    await sendMail({
      to: params.paymentEmails,
      subject: `Instructions de règlement — adhésion ${params.adherentName}`,
      html: instructionsMail.html,
      text: instructionsMail.text,
      attachments: [getSqyPingLogoAttachment()],
    });
  } catch (emailError) {
    console.error("[request-payment] instructions email", emailError);
    return {
      success: false,
      error: "Dossier mis à jour mais l'e-mail d'instructions n'a pas pu être envoyé.",
    };
  }

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_REQUESTED, params.requestedByUid, {
    resource: "clubRegistration",
    resourceId: params.registrationId,
    details: {
      amountCents: params.amountToPayCents,
      manualFollowUp: true,
      paymentMethod: manualPayment.paymentMethod,
      donationCents: params.donationPricing?.voluntaryDonationCents ?? 0,
      donationDiscountCents: params.donationPricing?.donationDiscountCents ?? 0,
    },
    success: true,
  });

  return { success: true };
}

export function recalculatePaymentForRequest(
  payment: RegistrationPayment | null,
  quote: PriceQuote | null,
  invoiceTotalCents: number
): RegistrationPayment | null {
  if (!payment || !quote) {
    return payment;
  }
  let updated = recalculateRegistrationPayment({
    ...payment,
    totalAmountCents: invoiceTotalCents,
  });
  if (updated.paymentMethod === "card" || updated.paymentMethod === "cheque") {
    updated = regenerateExpectedPayments(updated);
  }
  return updated;
}

export async function createStripeCheckoutForRegistration(params: {
  registrationId: string;
  quote: PriceQuote | null;
  donationPricing: DonationPricingBreakdown | null;
  pricingConfig: RegistrationConfigV1;
  payment: RegistrationPayment | null;
  amountToPayCents: number;
  paymentEmail: string;
  adherentName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<
  | { ok: true; result: StripeCheckoutSessionResult }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const useQuoteLineItems =
    params.quote != null &&
    params.donationPricing != null &&
    params.donationPricing.invoiceTotalCents > 0;

  if (useQuoteLineItems && params.quote && params.donationPricing) {
    const validation = validateRegistrationStripeCheckout({
      quote: params.quote,
      donationPricing: params.donationPricing,
      pricingConfig: params.pricingConfig,
      payment: params.payment,
      amountToPayCents: params.amountToPayCents,
    });
    if (!validation.ok) {
      return validation;
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
    const invoiceCustomFields = buildStripeInvoiceCustomFields(
      quote,
      stripePresentation,
      donationContext,
      paymentAids
    );

    const aidDiscountCents = sumPaymentAidDiscountCents(paymentAids);

    const discountCouponIds = await createCheckoutDiscountCouponIds({
      registrationId: params.registrationId,
      donationDiscountCents: donationPricing.donationDiscountCents,
      donationDiscountCouponName: stripePresentation.donationDiscountCouponName,
      aids: paymentAids,
    });

    const session = await createMembershipCheckoutSession({
      registrationId: params.registrationId,
      lineItems: stripeLineItems,
      customerEmail: params.paymentEmail,
      customerName: params.adherentName,
      invoiceDescription: renderInvoiceHeader(stripePresentation.invoiceHeaderTemplate, {
        clubName: params.pricingConfig.meta.clubName,
        registrationId: params.registrationId,
        adherentName: params.adherentName,
      }),
      catalogVersion: quote.catalogVersion,
      quoteHash: hashPriceQuote(quote),
      invoiceCustomFields,
      discountCouponIds,
      donationCents: donationPricing.voluntaryDonationCents,
      donationDiscountCents: donationPricing.donationDiscountCents,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    return {
      ok: true,
      result: {
        session: { id: session.id, url: session.url },
        legacy: false,
        stripeLineItems,
        aidDiscountCents,
      },
    };
  }

  const session = await createLegacySingleLineCheckoutSession({
    registrationId: params.registrationId,
    amountCents: params.amountToPayCents,
    customerEmail: params.paymentEmail,
    adherentName: params.adherentName,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });

  return {
    ok: true,
    result: {
      session: { id: session.id, url: session.url },
      legacy: true,
    },
  };
}

export async function persistSelfServiceStripeCheckout(params: {
  docRef: DocumentReference;
  checkout: StripeCheckoutSessionResult;
}): Promise<void> {
  await params.docRef.set(
    {
      stripeCheckoutSessionId: params.checkout.session.id,
      stripeCheckoutUrl: params.checkout.session.url,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
