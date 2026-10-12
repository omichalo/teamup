import type { Firestore } from "firebase-admin/firestore";
import { allocateCampDocumentNumber } from "./payment-documents/document-numbers";
import { getCamp, getCampRegistration, updateCampRegistration } from "./store";
import type { CampPaymentMethodId } from "./constants";
import type { CampReceivedPayment, CampRegistration } from "./types";

function receivedTotal(reg: CampRegistration): number {
  return reg.payment.receivedPayments.reduce((sum, p) => sum + p.amountCents, 0);
}

export async function ensureCampInvoiceNumber(
  db: Firestore,
  registration: CampRegistration
): Promise<string> {
  if (registration.payment.invoiceNumber) {
    return registration.payment.invoiceNumber;
  }
  const camp = await getCamp(db, registration.campId);
  const seasonLabel = camp?.seasonLabel ?? String(new Date().getFullYear());
  const invoiceNumber = await allocateCampDocumentNumber({
    db,
    seasonLabel,
    prefix: "STG-FAC",
  });
  await updateCampRegistration(db, registration.id, {
    "payment.invoiceNumber": invoiceNumber,
  });
  return invoiceNumber;
}

export async function recordCampPayment(params: {
  db: Firestore;
  registrationId: string;
  method: CampPaymentMethodId;
  amountCents: number;
  recordedByUid: string;
  paidAt?: string | undefined;
  reference?: string | null | undefined;
  stripeCheckoutSessionId?: string | null | undefined;
}): Promise<CampRegistration> {
  const registration = await getCampRegistration(params.db, params.registrationId);
  if (!registration) {
    throw new Error("Inscription introuvable");
  }
  if (registration.status === "cancelled") {
    throw new Error("Inscription annulée");
  }

  const invoiceNumber = await ensureCampInvoiceNumber(params.db, registration);

  const camp = await getCamp(params.db, registration.campId);
  const seasonLabel = camp?.seasonLabel ?? String(new Date().getFullYear());
  const receiptNumber = await allocateCampDocumentNumber({
    db: params.db,
    seasonLabel,
    prefix: "STG-REC",
  });

  const payment: CampReceivedPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method: params.method,
    amountCents: params.amountCents,
    paidAt: params.paidAt ?? new Date().toISOString(),
    recordedByUid: params.recordedByUid,
    reference: params.reference ?? null,
    documentNumber: receiptNumber,
    stripeCheckoutSessionId: params.stripeCheckoutSessionId ?? null,
  };

  const receivedPayments = [...registration.payment.receivedPayments, payment];
  const paidSum = receivedPayments.reduce((sum, p) => sum + p.amountCents, 0);
  const due = registration.pricingQuote.totalCents;
  const fullyPaid = paidSum >= due;

  await updateCampRegistration(params.db, registration.id, {
    status: fullyPaid ? "paid" : "partially_paid",
    payment: {
      ...registration.payment,
      invoiceNumber,
      status: fullyPaid ? "paid" : "partially_paid",
      receivedPayments,
      stripeCheckoutSessionId:
        params.stripeCheckoutSessionId ??
        registration.payment.stripeCheckoutSessionId,
      stripeCheckoutUrl: fullyPaid ? null : registration.payment.stripeCheckoutUrl,
    },
  });

  const updated = await getCampRegistration(params.db, params.registrationId);
  if (!updated) throw new Error("Inscription introuvable après paiement");
  return updated;
}

export async function applyCampStripeCheckoutPaid(params: {
  db: Firestore;
  registrationId: string;
  sessionId: string;
  amountCents: number;
}): Promise<{ duplicate: boolean; registration: CampRegistration | null }> {
  const registration = await getCampRegistration(params.db, params.registrationId);
  if (!registration) {
    return { duplicate: false, registration: null };
  }

  const already = registration.payment.receivedPayments.some(
    (p) => p.stripeCheckoutSessionId === params.sessionId
  );
  if (already || registration.status === "paid") {
    return { duplicate: true, registration };
  }

  const amount =
    params.amountCents > 0
      ? params.amountCents
      : Math.max(0, registration.pricingQuote.totalCents - receivedTotal(registration));

  const updated = await recordCampPayment({
    db: params.db,
    registrationId: params.registrationId,
    method: "card",
    amountCents: amount,
    recordedByUid: "stripe",
    stripeCheckoutSessionId: params.sessionId,
  });
  return { duplicate: false, registration: updated };
}
