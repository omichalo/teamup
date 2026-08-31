import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { PLAYERS_ARCHIVE_COLLECTION } from "@/lib/players/collections";
import { typeLicenceFromFfttDetails } from "@/lib/players/current-club-license";
const FETCH_CONCURRENCY = 25;
const WRITE_CHUNK = 400;

export type UnlistedMirrorFields = {
  nomClub: string;
  numClub: string;
  club: string;
  typeLicence: string;
};

export function unlistedMirrorFieldsFromFfttDetails(
  details: Record<string, unknown>
): UnlistedMirrorFields {
  const nomClub =
    typeof details.nomClub === "string" ? details.nomClub.trim() : "";
  const numClub =
    typeof details.numClub === "string" ? details.numClub.trim() : "";
  return {
    nomClub,
    numClub,
    club: nomClub,
    typeLicence: typeLicenceFromFfttDetails(details.typeLicence),
  };
}

export async function refreshUnlistedPlayerMirrors(
  db: Firestore,
  fetchDetails: (licence: string) => Promise<Record<string, unknown> | null>
): Promise<{ updated: number; errors: number }> {
  const snap = await db.collection(PLAYERS_ARCHIVE_COLLECTION).get();
  const unlisted = snap.docs.filter((doc) => doc.data().isTemporary !== true);

  const pending: Array<{ ref: DocumentReference; fields: UnlistedMirrorFields }> =
    [];
  let errors = 0;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < unlisted.length) {
      const index = cursor;
      cursor += 1;
      const doc = unlisted[index];
      if (!doc) {
        continue;
      }
      const licence = String(doc.data().licence ?? doc.id).replace(/\D/g, "");
      if (!licence) {
        continue;
      }
      try {
        const details = await fetchDetails(licence);
        if (!details) {
          continue;
        }
        pending.push({
          ref: doc.ref,
          fields: unlistedMirrorFieldsFromFfttDetails(details),
        });
      } catch {
        errors += 1;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(FETCH_CONCURRENCY, unlisted.length) },
      () => worker()
    )
  );

  for (let i = 0; i < pending.length; i += WRITE_CHUNK) {
    const batch = db.batch();
    for (const item of pending.slice(i, i + WRITE_CHUNK)) {
      batch.set(item.ref, { listedInClub: false, ...item.fields }, { merge: true });
    }
    await batch.commit();
  }

  return { updated: pending.length, errors };
}
