import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { championshipPlayersCollectionPath } from "./paths";
import type {
  ChampionshipPlayerRecord,
  PlayerClubProfileRecord,
} from "./records";
import { PLAYER_CLUB_PROFILES_COLLECTION } from "./paths";
import { omitUndefinedFields } from "./omit-undefined-fields";

export function championshipPlayersCollection(
  db: Firestore,
  seasonLabel: string
) {
  return db.collection(championshipPlayersCollectionPath(seasonLabel));
}

export async function getChampionshipPlayer(
  db: Firestore,
  seasonLabel: string,
  personKey: string
): Promise<(ChampionshipPlayerRecord & { id: string }) | null> {
  const snap = await championshipPlayersCollection(db, seasonLabel)
    .doc(personKey)
    .get();
  if (!snap.exists) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as ChampionshipPlayerRecord) };
}

export async function listChampionshipPlayers(
  db: Firestore,
  seasonLabel: string
): Promise<Array<ChampionshipPlayerRecord & { id: string }>> {
  const snap = await championshipPlayersCollection(db, seasonLabel).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ChampionshipPlayerRecord),
  }));
}

export async function upsertChampionshipPlayer(
  db: Firestore,
  record: ChampionshipPlayerRecord
): Promise<void> {
  const { personKey, seasonLabel, ...rest } = record;
  await championshipPlayersCollection(db, seasonLabel)
    .doc(personKey)
    .set(
      omitUndefinedFields({
        ...rest,
        personKey,
        seasonLabel,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );
}

export async function findChampionshipPlayerByRegistrationId(
  db: Firestore,
  seasonLabel: string,
  registrationId: string
): Promise<(ChampionshipPlayerRecord & { id: string }) | null> {
  const snap = await championshipPlayersCollection(db, seasonLabel)
    .where("registrationId", "==", registrationId)
    .limit(2)
    .get();
  if (snap.empty) {
    return null;
  }
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as ChampionshipPlayerRecord) };
}

export async function deleteChampionshipPlayer(
  db: Firestore,
  seasonLabel: string,
  personKey: string
): Promise<void> {
  await championshipPlayersCollection(db, seasonLabel).doc(personKey).delete();
}

export async function getPlayerClubProfile(
  db: Firestore,
  personKey: string
): Promise<PlayerClubProfileRecord | null> {
  const snap = await db
    .collection(PLAYER_CLUB_PROFILES_COLLECTION)
    .doc(personKey)
    .get();
  if (!snap.exists) {
    return null;
  }
  return snap.data() as PlayerClubProfileRecord;
}

export async function upsertPlayerClubProfile(
  db: Firestore,
  profile: PlayerClubProfileRecord
): Promise<void> {
  await db
    .collection(PLAYER_CLUB_PROFILES_COLLECTION)
    .doc(profile.personKey)
    .set(
      omitUndefinedFields({
        ...profile,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );
}
