import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
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

  const dataToMerge: Record<string, unknown> = {
    journee: params.journee,
    phase: params.phase,
    championshipType: params.championshipType,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existingSnap.exists) {
    dataToMerge.createdAt = FieldValue.serverTimestamp();
  } else if (existingSnap.data()?.createdAt instanceof Timestamp) {
    dataToMerge.createdAt = existingSnap.data()?.createdAt;
  }

  if (params.date !== undefined) {
    dataToMerge.date = params.date;
  } else if (existingSnap.data()?.date !== undefined) {
    dataToMerge.date = existingSnap.data()?.date;
  }

  if (params.idEpreuve !== undefined) {
    dataToMerge.idEpreuve = params.idEpreuve;
  }

  for (const { playerId, response } of params.playerUpdates) {
    if (!playerId || typeof playerId !== "string" || playerId.trim().length === 0) {
      continue;
    }

    const sanitized =
      response === null ? undefined : sanitizeAvailabilityResponse(response);

    if (!sanitized) {
      dataToMerge[`players.${playerId}`] = FieldValue.delete();
      continue;
    }

    dataToMerge[`players.${playerId}`] = sanitized;
  }

  await docRef.set(dataToMerge, { merge: true });
}
