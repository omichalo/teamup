import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  PLAYERS_ARCHIVE_COLLECTION,
  PLAYERS_COLLECTION,
} from "@/lib/players/collections";
import { PLAYER_CLUB_PROFILES_COLLECTION } from "./paths";

export async function backfillPlayerClubProfilesFromPlayers(
  db: Firestore
): Promise<{ copied: number }> {
  const [activeSnap, archiveSnap] = await Promise.all([
    db.collection(PLAYERS_COLLECTION).get(),
    db.collection(PLAYERS_ARCHIVE_COLLECTION).get(),
  ]);
  const snapDocs = [...activeSnap.docs, ...archiveSnap.docs];
  let copied = 0;
  const chunkSize = 400;
  const docs = snapDocs.filter((doc) => {
    const data = doc.data();
    return (
      Array.isArray(data.discordMentions) && data.discordMentions.length > 0
    ) || data.isWheelchair === true;
  });

  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + chunkSize)) {
      const data = doc.data();
      const personKey = String(data.licence ?? doc.id).replace(/\D/g, "") || doc.id;
      batch.set(
        db.collection(PLAYER_CLUB_PROFILES_COLLECTION).doc(personKey),
        {
          personKey,
          discordMentions: Array.isArray(data.discordMentions)
            ? data.discordMentions.filter((item: unknown) => typeof item === "string")
            : [],
          isWheelchair: data.isWheelchair === true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      copied += 1;
    }
    await batch.commit();
  }
  return { copied };
}
