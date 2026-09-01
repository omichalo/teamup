import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import { registrationMissingSeasonLabel } from "@/lib/club-registration/resolve-registration-season-label";

const BATCH_SIZE = 400;

export type BackfillRegistrationSeasonLabelResult = {
  scanned: number;
  updated: number;
};

/**
 * Renseigne `seasonLabel` sur les dossiers où il est absent (saison d'introduction du champ).
 */
export async function backfillRegistrationSeasonLabelOnDocs(
  db: Firestore,
  docs: QueryDocumentSnapshot[],
  seasonLabel: string
): Promise<BackfillRegistrationSeasonLabelResult> {
  const toUpdate = docs.filter((doc) => registrationMissingSeasonLabel(doc.data()));
  if (toUpdate.length === 0) {
    return { scanned: docs.length, updated: 0 };
  }

  let updated = 0;
  for (let offset = 0; offset < toUpdate.length; offset += BATCH_SIZE) {
    const chunk = toUpdate.slice(offset, offset + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, {
        seasonLabel,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    updated += chunk.length;
  }

  return { scanned: docs.length, updated };
}

/** Parcourt la collection et corrige les dossiers sans `seasonLabel`. */
export async function backfillAllMissingRegistrationSeasonLabels(
  db: Firestore,
  seasonLabel: string,
  scanLimit = 500
): Promise<BackfillRegistrationSeasonLabelResult> {
  const snap = await db.collection(COLLECTION).limit(scanLimit).get();
  return backfillRegistrationSeasonLabelOnDocs(db, snap.docs, seasonLabel);
}
