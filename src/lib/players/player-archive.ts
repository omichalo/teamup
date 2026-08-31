import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  PLAYERS_ARCHIVE_COLLECTION,
  PLAYERS_COLLECTION,
} from "@/lib/players/collections";

const BATCH_CHUNK = 200;

export type PlayerArchiveReconcileResult = {
  listed: number;
  archived: number;
  restored: number;
};

export function normalizePlayerLicence(
  licence: string | null | undefined
): string {
  return (licence ?? "").replace(/\D/g, "");
}

export function buildListedLicenceSet(
  listedLicences: Iterable<string>
): Set<string> {
  return new Set(
    [...listedLicences]
      .map((licence) => normalizePlayerLicence(licence))
      .filter(Boolean)
  );
}

function isListedLicence(
  listed: Set<string>,
  licence: string,
  docId: string
): boolean {
  return listed.has(licence) || listed.has(docId);
}

function shouldKeepInActiveCollection(data: Record<string, unknown>): boolean {
  return data.isTemporary === true;
}

async function commitMoves(
  db: Firestore,
  moves: Array<{ from: DocumentReference; to: DocumentReference; data: Record<string, unknown> }>
): Promise<number> {
  let moved = 0;
  for (let i = 0; i < moves.length; i += BATCH_CHUNK) {
    const batch = db.batch();
    for (const move of moves.slice(i, i + BATCH_CHUNK)) {
      batch.set(move.to, move.data, { merge: true });
      batch.delete(move.from);
      moved += 1;
    }
    await batch.commit();
  }
  return moved;
}

export async function restoreListedPlayersFromArchive(
  db: Firestore,
  listedLicences: Iterable<string>
): Promise<number> {
  const listed = buildListedLicenceSet(listedLicences);
  if (listed.size === 0) {
    return 0;
  }

  const archiveSnap = await db.collection(PLAYERS_ARCHIVE_COLLECTION).get();
  const now = FieldValue.serverTimestamp();
  const moves: Array<{
    from: DocumentReference;
    to: DocumentReference;
    data: Record<string, unknown>;
  }> = [];

  for (const doc of archiveSnap.docs) {
    const licence = normalizePlayerLicence(
      String(doc.data().licence ?? doc.id)
    );
    if (!licence || !isListedLicence(listed, licence, doc.id)) {
      continue;
    }

    const rest = { ...doc.data() };
    delete rest.archivedAt;
    moves.push({
      from: doc.ref,
      to: db.collection(PLAYERS_COLLECTION).doc(doc.id),
      data: {
        ...rest,
        listedInClub: true,
        lastSeenInClubListAt: now,
      },
    });
  }

  return commitMoves(db, moves);
}

export async function archiveUnlistedPlayersFromActive(
  db: Firestore,
  listedLicences: Iterable<string>
): Promise<number> {
  const listed = buildListedLicenceSet(listedLicences);
  const activeSnap = await db.collection(PLAYERS_COLLECTION).get();
  const now = FieldValue.serverTimestamp();
  const moves: Array<{
    from: DocumentReference;
    to: DocumentReference;
    data: Record<string, unknown>;
  }> = [];

  for (const doc of activeSnap.docs) {
    const data = doc.data();
    if (shouldKeepInActiveCollection(data)) {
      continue;
    }

    const licence = normalizePlayerLicence(String(data.licence ?? doc.id));
    if (!licence) {
      continue;
    }
    if (isListedLicence(listed, licence, doc.id)) {
      continue;
    }

    moves.push({
      from: doc.ref,
      to: db.collection(PLAYERS_ARCHIVE_COLLECTION).doc(doc.id),
      data: {
        ...data,
        listedInClub: false,
        typeLicence: FieldValue.delete(),
        archivedAt: now,
      },
    });
  }

  return commitMoves(db, moves);
}

/**
 * Restores licences back to `players`, then archives active docs no longer listed.
 */
export async function reconcilePlayersAfterSync(
  db: Firestore,
  listedLicences: Iterable<string>
): Promise<PlayerArchiveReconcileResult> {
  const listed = buildListedLicenceSet(listedLicences);
  const restored = await restoreListedPlayersFromArchive(db, listed);
  const archived = await archiveUnlistedPlayersFromActive(db, listed);

  const activeSnap = await db.collection(PLAYERS_COLLECTION).get();
  let listedCount = 0;
  for (const doc of activeSnap.docs) {
    const licence = normalizePlayerLicence(String(doc.data().licence ?? doc.id));
    if (isListedLicence(listed, licence, doc.id)) {
      listedCount += 1;
    }
  }

  return { listed: listedCount, archived, restored };
}

export async function countArchivedPlayers(db: Firestore): Promise<number> {
  const snap = await db.collection(PLAYERS_ARCHIVE_COLLECTION).get();
  return snap.size;
}
