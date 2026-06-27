import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { ChampionshipType } from "@/types";
import {
  AvailabilityResponse,
  DayAvailability,
  PlayerAvailability,
} from "@/lib/services/availability-service";
import { getAvailabilityDocumentId } from "@/lib/availability/document-id";
import { applyPlayerAvailabilityUpdates } from "@/lib/availability/firestore-persistence";
import { sanitizeAvailabilityResponse } from "@/lib/availability/sanitize-response";

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
};

export class AvailabilityServiceAdmin {
  private readonly collectionName = "availabilities";

  private getDocumentId(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): string {
    return getAvailabilityDocumentId(journee, phase, championshipType, idEpreuve);
  }

  async getAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): Promise<DayAvailability | null> {
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(journee, phase, championshipType, idEpreuve);
      const docSnap = await db.collection(this.collectionName).doc(docId).get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data();
      if (!data) {
        return null;
      }

      return {
        journee: data.journee,
        phase: data.phase || phase,
        championshipType: data.championshipType,
        idEpreuve: data.idEpreuve,
        date: data.date,
        players: (data.players as PlayerAvailability) || {},
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de la disponibilité:",
        error
      );
      throw error;
    }
  }

  async saveAvailability(availability: DayAvailability): Promise<void> {
    const playerUpdates = Object.entries(availability.players).map(
      ([playerId, response]) => ({
        playerId,
        response: sanitizeAvailabilityResponse(response) ?? null,
      })
    );

    if (playerUpdates.length === 0) {
      return;
    }

    const db = getFirestoreAdmin();
    await applyPlayerAvailabilityUpdates(db, {
      journee: availability.journee,
      phase: availability.phase,
      championshipType: availability.championshipType,
      ...(availability.idEpreuve !== undefined
        ? { idEpreuve: availability.idEpreuve }
        : {}),
      ...(availability.date !== undefined ? { date: availability.date } : {}),
      playerUpdates,
    });
  }

  async updatePlayerAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    playerId: string,
    response: AvailabilityResponse,
    idEpreuve?: number
  ): Promise<void> {
    try {
      const db = getFirestoreAdmin();
      const sanitized = sanitizeAvailabilityResponse(response);

      await applyPlayerAvailabilityUpdates(db, {
        journee,
        phase,
        championshipType,
        ...(idEpreuve !== undefined ? { idEpreuve } : {}),
        playerUpdates: [
          {
            playerId,
            response: sanitized ?? null,
          },
        ],
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la disponibilité:",
        error
      );
      throw error;
    }
  }
}
