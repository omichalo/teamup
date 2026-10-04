import type { Firestore } from "firebase-admin/firestore";
import { getRegistrationPaymentAids } from "@/lib/club-registration/payment/aid-receipt";
import {
  isExceptionalDiscountAidType,
  sumExceptionalDiscountCents,
} from "@/lib/club-registration/payment/exceptional-discount";
import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import { parseStoredPriceQuote } from "@/lib/pricing/parse-stored-quote";
import {
  assignPaymentDocumentNumbersIfEligible,
  type AssignedPaymentDocumentNumbers,
} from "./assign-document-numbers";
import { ensureReceivedAidDocumentNumbers } from "./ensure-received-aid-numbers";
import {
  ensureInitialAccountingInvoiceSnapshot,
  reconcileAccountingInvoicesAfterQuoteChange,
} from "./reconcile-accounting-invoices";

const COLLECTION = "clubRegistrations";

/**
 * Recharge le dossier puis attribue FAC/REC si éligible.
 * À appeler après une écriture qui peut engager facture ou encaissement.
 */
export async function syncPaymentDocumentNumbersForRegistration(
  db: Firestore,
  registrationId: string
): Promise<AssignedPaymentDocumentNumbers | null> {
  const snap = await db.collection(COLLECTION).doc(registrationId).get();
  if (!snap.exists) {
    return null;
  }
  return assignPaymentDocumentNumbersIfEligible({
    db,
    registrationId,
    data: (snap.data() ?? {}) as Record<string, unknown>,
  });
}

function resolveInvoiceTotalCents(data: Record<string, unknown>): number {
  const quote = parseStoredPriceQuote(data.pricingQuote);
  if (!quote) {
    return 0;
  }
  return resolveRegistrationDonationPricing(quote, data).invoiceTotalCents;
}

/**
 * Total comptable cible = devis (hors aides collectibles) − remise exceptionnelle.
 * Les aides Pass Sport / Labaz soldent le 411 via AID, elles ne réduisent pas la FAC.
 */
export function resolveAccountingInvoiceTargetCents(
  data: Record<string, unknown>
): number {
  const quoteTotal = resolveInvoiceTotalCents(data);
  const discount = sumExceptionalDiscountCents(getRegistrationPaymentAids(data));
  return Math.max(0, quoteTotal - discount);
}

/**
 * Après écriture dossier : FAC/REC + snapshot FAC + AID reçues + réconciliation devis.
 */
export async function syncAccountingDocumentsAfterRegistrationWrite(
  db: Firestore,
  registrationId: string,
  options?: { reconcileQuote?: boolean; reason?: string }
): Promise<void> {
  await syncPaymentDocumentNumbersForRegistration(db, registrationId);

  const snap = await db.collection(COLLECTION).doc(registrationId).get();
  if (!snap.exists) {
    return;
  }
  let data = (snap.data() ?? {}) as Record<string, unknown>;

  await ensureInitialAccountingInvoiceSnapshot({
    db,
    registrationId,
    data,
  });

  const afterSnapshot = await db.collection(COLLECTION).doc(registrationId).get();
  data = (afterSnapshot.data() ?? {}) as Record<string, unknown>;

  await ensureReceivedAidDocumentNumbers({
    db,
    registrationId,
    data,
  });

  if (options?.reconcileQuote === false) {
    return;
  }

  const afterAids = await db.collection(COLLECTION).doc(registrationId).get();
  data = (afterAids.data() ?? {}) as Record<string, unknown>;
  const newInvoiceTotalCents = resolveAccountingInvoiceTargetCents(data);
  if (newInvoiceTotalCents <= 0 && !data.pricingQuote) {
    return;
  }

  const aids = getRegistrationPaymentAids(data);
  const discount = sumExceptionalDiscountCents(aids);
  const discountNote = aids
    .filter(
      (aid) =>
        isExceptionalDiscountAidType(aid.type) &&
        aid.amountCents > 0 &&
        typeof aid.note === "string" &&
        aid.note.trim().length > 0
    )
    .map((aid) => aid.note!.trim())[0];
  const reason =
    options?.reason ??
    (discount > 0
      ? discountNote
        ? `Remise exceptionnelle — ${discountNote}`
        : `Remise exceptionnelle (${(discount / 100).toFixed(2)} €)`
      : undefined);

  await reconcileAccountingInvoicesAfterQuoteChange({
    db,
    registrationId,
    data,
    newInvoiceTotalCents,
    ...(reason ? { reason } : {}),
  });
}
