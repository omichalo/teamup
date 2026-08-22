import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

const PLAYERS = "players";

export async function markPlayersListedInClub(
  db: Firestore,
  listedLicences: Iterable<string>
): Promise<{ listed: number; unlisted: number }> {
  const listed = new Set(
    [...listedLicences].map((licence) => licence.replace(/\D/g, "")).filter(Boolean)
  );
  const snap = await db.collection(PLAYERS).get();
  let listedCount = 0;
  let unlistedCount = 0;
  const now = FieldValue.serverTimestamp();

  const pending: Array<{ ref: DocumentReference; listedInClub: boolean }> = [];
  for (const doc of snap.docs) {
    const licence = String(doc.data().licence ?? doc.id).replace(/\D/g, "");
    const listedInClub = listed.has(licence) || listed.has(doc.id);
    pending.push({ ref: doc.ref, listedInClub });
    if (listedInClub) {
      listedCount += 1;
    } else {
      unlistedCount += 1;
    }
  }

  const chunkSize = 400;
  for (let i = 0; i < pending.length; i += chunkSize) {
    const batch = db.batch();
    for (const item of pending.slice(i, i + chunkSize)) {
      batch.set(
        item.ref,
        item.listedInClub
          ? { listedInClub: true, lastSeenInClubListAt: now }
          : { listedInClub: false, typeLicence: FieldValue.delete() },
        { merge: true }
      );
    }
    await batch.commit();
  }

  return { listed: listedCount, unlisted: unlistedCount };
}
