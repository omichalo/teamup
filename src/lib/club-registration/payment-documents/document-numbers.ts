import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export type PaymentDocumentKind = "invoice" | "receipt";

const COUNTERS_COLLECTION = "clubPaymentDocumentCounters";
const REGISTRATIONS_COLLECTION = "clubRegistrations";

const FIELD_BY_KIND: Record<
  PaymentDocumentKind,
  { registrationField: string; counterField: string; prefix: "FAC" | "REC" }
> = {
  invoice: {
    registrationField: "teamupInvoiceNumber",
    counterField: "nextInvoiceSeq",
    prefix: "FAC",
  },
  receipt: {
    registrationField: "teamupReceiptNumber",
    counterField: "nextReceiptSeq",
    prefix: "REC",
  },
};

function resolveSeasonKey(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim().replace(/\s+/g, "-");
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim().replace(/\s+/g, "-");
  }
  return String(new Date().getFullYear());
}

export function formatPaymentDocumentNumber(
  prefix: "FAC" | "REC",
  seasonKey: string,
  sequence: number
): string {
  return `${prefix}-${seasonKey}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Attribue un n° de facture/reçu stable et séquentiel par saison.
 * Réutilise la valeur déjà stockée sur le dossier si elle existe.
 */
export async function ensurePaymentDocumentNumber(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
  kind: PaymentDocumentKind;
}): Promise<string> {
  const meta = FIELD_BY_KIND[params.kind];
  const existing = params.data[meta.registrationField];
  if (typeof existing === "string" && existing.trim().length > 0) {
    return existing.trim();
  }

  const seasonKey = resolveSeasonKey(params.data);
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);
  const counterRef = params.db.collection(COUNTERS_COLLECTION).doc(seasonKey);

  const assigned = await params.db.runTransaction(async (tx) => {
    const registrationSnap = await tx.get(registrationRef);
    const registrationData = (registrationSnap.data() ?? {}) as Record<string, unknown>;
    const already = registrationData[meta.registrationField];
    if (typeof already === "string" && already.trim().length > 0) {
      return already.trim();
    }

    const counterSnap = await tx.get(counterRef);
    const current =
      typeof counterSnap.data()?.[meta.counterField] === "number"
        ? (counterSnap.data()?.[meta.counterField] as number)
        : 0;
    const next = current + 1;
    const documentNumber = formatPaymentDocumentNumber(meta.prefix, seasonKey, next);

    tx.set(
      counterRef,
      {
        seasonKey,
        [meta.counterField]: next,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.set(
      registrationRef,
      {
        [meta.registrationField]: documentNumber,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return documentNumber;
  });

  return assigned;
}
