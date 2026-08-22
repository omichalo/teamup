import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

const TEAMS = "teams";

export async function markTeamsListedInFftt(
  db: Firestore,
  listedTeamIds: Iterable<string>
): Promise<{ listed: number; unlisted: number }> {
  const listed = new Set([...listedTeamIds].filter(Boolean));
  // Une synchro vide (mauvais filtre d'épreuve, API partielle) ne doit pas
  // dé-lister tout le club.
  if (listed.size === 0) {
    return { listed: 0, unlisted: 0 };
  }
  const snap = await db.collection(TEAMS).get();
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
