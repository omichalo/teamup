import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
} from "firebase-admin/firestore";
import {
  PLAYERS_ARCHIVE_COLLECTION,
  PLAYERS_COLLECTION,
} from "@/lib/players/collections";
import { normalizePlayerLicence } from "@/lib/players/player-archive";

export type ResolvedPlayerDoc = {
  ref: DocumentReference;
  snap: DocumentSnapshot;
  collection: typeof PLAYERS_COLLECTION | typeof PLAYERS_ARCHIVE_COLLECTION;
};

export async function getPlayerDocByLicence(
  db: Firestore,
  licence: string | null | undefined
): Promise<ResolvedPlayerDoc | null> {
  const id = normalizePlayerLicence(licence);
  if (!id) {
    return null;
  }

  const activeRef = db.collection(PLAYERS_COLLECTION).doc(id);
  const activeSnap = await activeRef.get();
  if (activeSnap.exists) {
    return {
      ref: activeRef,
      snap: activeSnap,
      collection: PLAYERS_COLLECTION,
    };
  }

  const archiveRef = db.collection(PLAYERS_ARCHIVE_COLLECTION).doc(id);
  const archiveSnap = await archiveRef.get();
  if (!archiveSnap.exists) {
    return null;
  }

  return {
    ref: archiveRef,
    snap: archiveSnap,
    collection: PLAYERS_ARCHIVE_COLLECTION,
  };
}

export async function findPlayerByDiscordUserId(
  db: Firestore,
  userId: string
): Promise<ResolvedPlayerDoc | null> {
  const [activeMatch, archiveMatch] = await Promise.all([
    db
      .collection(PLAYERS_COLLECTION)
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get(),
    db
      .collection(PLAYERS_ARCHIVE_COLLECTION)
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get(),
  ]);

  const activeDoc = activeMatch.docs[0];
  if (activeDoc) {
    return {
      ref: activeDoc.ref,
      snap: activeDoc,
      collection: PLAYERS_COLLECTION,
    };
  }

  const archiveDoc = archiveMatch.docs[0];
  if (!archiveDoc) {
    return null;
  }

  return {
    ref: archiveDoc.ref,
    snap: archiveDoc,
    collection: PLAYERS_ARCHIVE_COLLECTION,
  };
}
