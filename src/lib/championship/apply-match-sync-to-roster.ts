import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { championshipPlayersCollection } from "./store";

export type MatchSyncBurnoutUpdate = Record<string, unknown>;

function remapMatchSyncUpdates(
  playerId: string,
  seasonLabel: string,
  updates: MatchSyncBurnoutUpdate
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    personKey: playerId,
    seasonLabel,
    ffttLicense: playerId,
    coachExcluded: false,
    includedFromDossier: false,
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (next["participation.championnat"] === true) {
    next.championnat = true;
    delete next["participation.championnat"];
  }
  if (next["participation.championnatParis"] === true) {
    next.championnatParis = true;
    delete next["participation.championnatParis"];
  }
  return next;
}

export async function applyMatchSyncUpdatesToRoster(
  db: Firestore,
  seasonLabel: string,
  playerId: string,
  updates: MatchSyncBurnoutUpdate
): Promise<void> {
  if (Object.keys(updates).length === 0) {
    return;
  }
  await championshipPlayersCollection(db, seasonLabel)
    .doc(playerId)
    .set(remapMatchSyncUpdates(playerId, seasonLabel, updates), { merge: true });
}

export async function loadChampionshipPlayersByIds(
  db: Firestore,
  seasonLabel: string,
  playerIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const col = championshipPlayersCollection(db, seasonLabel);
  const chunkSize = 10;
  for (let i = 0; i < playerIds.length; i += chunkSize) {
    const refs = playerIds.slice(i, i + chunkSize).map((id) => col.doc(id));
    if (refs.length === 0) {
      continue;
    }
    const docs = await db.getAll(...refs);
    for (const doc of docs) {
      if (doc.exists) {
        map.set(doc.id, doc.data() as Record<string, unknown>);
      }
    }
  }
  return map;
}

export async function commitMatchSyncUpdatesToRoster(
  db: Firestore,
  seasonLabel: string,
  playersToUpdate: Array<{ playerId: string; updates: MatchSyncBurnoutUpdate }>
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;
  const batchSize = 400;
  for (let i = 0; i < playersToUpdate.length; i += batchSize) {
    const batch = db.batch();
    const slice = playersToUpdate.slice(i, i + batchSize);
    for (const { playerId, updates } of slice) {
      batch.set(
        championshipPlayersCollection(db, seasonLabel).doc(playerId),
        remapMatchSyncUpdates(playerId, seasonLabel, updates),
        { merge: true }
      );
      updated += 1;
    }
    try {
      await batch.commit();
    } catch (error) {
      console.error("❌ Erreur lors du commit du brûlage roster:", error);
      errors += slice.length;
      updated -= slice.length;
    }
  }
  return { updated, errors };
}
