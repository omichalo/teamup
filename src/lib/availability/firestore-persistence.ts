import {
  FieldPath,
  FieldValue,
  Firestore,
  Timestamp,
} from "firebase-admin/firestore";
import { ChampionshipType } from "@/types";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import { getAvailabilityDocumentId } from "@/lib/availability/document-id";
import { sanitizeAvailabilityResponse } from "@/lib/availability/sanitize-response";

export type PlayerAvailabilityUpdate = {
  playerId: string;
  response: AvailabilityResponse | null;
};

export type ApplyPlayerAvailabilityUpdatesParams = {
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
  date?: string;
  playerUpdates: PlayerAvailabilityUpdate[];
};

/**
 * Écrit les disponibilités joueurs dans Firestore.
 *
 * Important: ne pas utiliser `set(..., { merge: true })` avec des clés
 * `players.${id}` — Firestore les traite alors comme des noms de champs
 * littéraux contenant un point, et non comme un chemin imbriqué.
 * `update()` interprète correctement les chemins pointés.
 */
export async function applyPlayerAvailabilityUpdates(
  db: Firestore,
  params: ApplyPlayerAvailabilityUpdatesParams
): Promise<void> {
  if (params.playerUpdates.length === 0) {
    return;
  }

  const docId = getAvailabilityDocumentId(
    params.journee,
    params.phase,
    params.championshipType,
    params.idEpreuve
  );
  const docRef = db.collection("availabilities").doc(docId);
  const existingSnap = await docRef.get();

  const meta: Record<string, unknown> = {
    journee: params.journee,
    phase: params.phase,
    championshipType: params.championshipType,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (params.date !== undefined) {
    meta.date = params.date;
  } else if (existingSnap.data()?.date !== undefined) {
    meta.date = existingSnap.data()?.date;
  }

  if (params.idEpreuve !== undefined) {
    meta.idEpreuve = params.idEpreuve;
  }

  const nestedPlayers: Record<string, AvailabilityResponse> = {};
  const updateFields: Array<string | FieldPath | unknown> = [];

  const pushUpdate = (field: string | FieldPath, value: unknown) => {
    updateFields.push(field, value);
  };

  for (const [key, value] of Object.entries(meta)) {
    pushUpdate(key, value);
  }

  for (const { playerId, response } of params.playerUpdates) {
    if (!playerId || typeof playerId !== "string" || playerId.trim().length === 0) {
      continue;
    }

    const sanitized =
      response === null ? undefined : sanitizeAvailabilityResponse(response);

    // Purge du champ littéral corrompu `players.<id>` (set+merge historique)
    pushUpdate(new FieldPath(`players.${playerId}`), FieldValue.delete());

    if (!sanitized) {
      pushUpdate(`players.${playerId}`, FieldValue.delete());
      continue;
    }

    nestedPlayers[playerId] = sanitized;
    pushUpdate(`players.${playerId}`, sanitized);
  }

  if (!existingSnap.exists) {
    await docRef.set({
      ...meta,
      createdAt: FieldValue.serverTimestamp(),
      players: nestedPlayers,
    });
    return;
  }

  if (existingSnap.data()?.createdAt instanceof Timestamp) {
    pushUpdate("createdAt", existingSnap.data()?.createdAt);
  }

  await docRef.update(
    ...(updateFields as [string | FieldPath, unknown, ...(string | FieldPath | unknown)[]])
  );
}
