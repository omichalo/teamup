import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export async function markMatchesListedInFftt(
  db: Firestore,
  teamId: string,
  listedMatchIds: Iterable<string>
): Promise<{ listed: number; unlisted: number }> {
  const listed = new Set([...listedMatchIds].filter(Boolean));
  if (!teamId || listed.size === 0) {
    return { listed: 0, unlisted: 0 };
  }

  const snap = await db.collection("teams").doc(teamId).collection("matches").get();
  const now = FieldValue.serverTimestamp();
  const pending: Array<{ ref: DocumentReference; listedInFftt: boolean }> = [];
  let listedCount = 0;
  let unlistedCount = 0;

  for (const doc of snap.docs) {
    const listedInFftt = listed.has(doc.id);
    pending.push({ ref: doc.ref, listedInFftt });
    if (listedInFftt) {
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
        item.listedInFftt
          ? { listedInFftt: true, lastSeenInFfttAt: now }
          : { listedInFftt: false },
        { merge: true }
      );
    }
    await batch.commit();
  }

  return { listed: listedCount, unlisted: unlistedCount };
}
