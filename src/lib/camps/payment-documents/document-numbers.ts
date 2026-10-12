import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { CAMP_COLLECTIONS } from "@/lib/camps/constants";

export type CampDocumentPrefix = "STG-FAC" | "STG-REC";

const COUNTER_FIELD: Record<CampDocumentPrefix, string> = {
  "STG-FAC": "nextInvoiceSeq",
  "STG-REC": "nextReceiptSeq",
};

export function formatCampDocumentNumber(
  prefix: CampDocumentPrefix,
  seasonKey: string,
  sequence: number
): string {
  return `${prefix}-${seasonKey}-${String(sequence).padStart(5, "0")}`;
}

export function resolveCampSeasonKey(seasonLabel: string): string {
  const trimmed = seasonLabel.trim();
  if (!trimmed) return String(new Date().getFullYear());
  return trimmed.replace(/\s+/g, "-");
}

export async function allocateCampDocumentNumber(params: {
  db: Firestore;
  seasonLabel: string;
  prefix: CampDocumentPrefix;
}): Promise<string> {
  const seasonKey = resolveCampSeasonKey(params.seasonLabel);
  const counterRef = params.db
    .collection(CAMP_COLLECTIONS.documentCounters)
    .doc(seasonKey);
  const field = COUNTER_FIELD[params.prefix];

  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current =
      typeof snap.data()?.[field] === "number" ? (snap.data()?.[field] as number) : 0;
    const next = current + 1;
    const documentNumber = formatCampDocumentNumber(params.prefix, seasonKey, next);
    tx.set(
      counterRef,
      {
        seasonKey,
        [field]: next,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return documentNumber;
  });
}
