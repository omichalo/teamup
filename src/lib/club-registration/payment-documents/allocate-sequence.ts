import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { formatPaymentDocumentNumber } from "./document-numbers";

const COUNTERS_COLLECTION = "clubPaymentDocumentCounters";

export type AccountingDocumentPrefix = "FAC" | "REC" | "AVO" | "AID";

const COUNTER_FIELD_BY_PREFIX: Record<AccountingDocumentPrefix, string> = {
  FAC: "nextInvoiceSeq",
  REC: "nextReceiptSeq",
  AVO: "nextCreditNoteSeq",
  AID: "nextAidSeq",
};

export function resolveAccountingSeasonKey(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim().replace(/\s+/g, "-");
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim().replace(/\s+/g, "-");
  }
  return String(new Date().getFullYear());
}

/** Alloue un ou plusieurs n° dans une transaction Firestore déjà ouverte. */
export async function allocateAccountingDocumentNumbersInTransaction(params: {
  tx: Transaction;
  db: Firestore;
  seasonKey: string;
  prefix: AccountingDocumentPrefix;
  count: number;
}): Promise<string[]> {
  if (params.count <= 0) {
    return [];
  }

  const counterRef = params.db.collection(COUNTERS_COLLECTION).doc(params.seasonKey);
  const counterSnap = await params.tx.get(counterRef);
  const field = COUNTER_FIELD_BY_PREFIX[params.prefix];
  let current =
    typeof counterSnap.data()?.[field] === "number"
      ? (counterSnap.data()?.[field] as number)
      : 0;

  const numbers: string[] = [];
  for (let i = 0; i < params.count; i += 1) {
    current += 1;
    numbers.push(formatPaymentDocumentNumber(params.prefix, params.seasonKey, current));
  }

  params.tx.set(
    counterRef,
    {
      seasonKey: params.seasonKey,
      [field]: current,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return numbers;
}

/** Alloue un n° dans une transaction Firestore déjà ouverte. */
export async function allocateAccountingDocumentNumberInTransaction(params: {
  tx: Transaction;
  db: Firestore;
  seasonKey: string;
  prefix: AccountingDocumentPrefix;
}): Promise<string> {
  const [number] = await allocateAccountingDocumentNumbersInTransaction({
    ...params,
    count: 1,
  });
  return number;
}

/** Alloue un n° dans une transaction dédiée. */
export async function allocateAccountingDocumentNumber(params: {
  db: Firestore;
  seasonKey: string;
  prefix: AccountingDocumentPrefix;
}): Promise<string> {
  return params.db.runTransaction(async (tx) =>
    allocateAccountingDocumentNumberInTransaction({
      tx,
      db: params.db,
      seasonKey: params.seasonKey,
      prefix: params.prefix,
    })
  );
}
