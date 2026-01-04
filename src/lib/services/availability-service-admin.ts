import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { ChampionshipType } from "@/types";
import {
  AvailabilityResponse,
  DayAvailability,
  PlayerAvailability,
} from "@/lib/services/availability-service";

const sanitizeResponse = (
  response?: AvailabilityResponse | null
): AvailabilityResponse | undefined => {
  if (!response) {
    return undefined;
  }

  const sanitized: AvailabilityResponse = {};

  if (typeof response.available === "boolean") {
    sanitized.available = response.available;
  }

  if (typeof response.comment === "string") {
    const trimmed = response.comment.trim();
    if (trimmed.length > 0) {
      sanitized.comment = trimmed;
    }
  }

  if (typeof response.fridayAvailable === "boolean") {
    sanitized.fridayAvailable = response.fridayAvailable;
  }

  if (typeof response.saturdayAvailable === "boolean") {
    sanitized.saturdayAvailable = response.saturdayAvailable;
  }

  if (
    sanitized.available === undefined &&
    sanitized.comment === undefined &&
    sanitized.fridayAvailable === undefined &&
    sanitized.saturdayAvailable === undefined
  ) {
    return undefined;
  }

  return sanitized;
};

const toTimestamp = (
  value: unknown | Date | Timestamp | undefined
): Timestamp => {
  if (value instanceof Timestamp) {
    return value;
  }

  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }

  return Timestamp.now();
};

export class AvailabilityServiceAdmin {
  private readonly collectionName = "availabilities";

  private getDocumentId(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): string {
    if (idEpreuve !== undefined) {
      return `${phase}_${journee}_${championshipType}_${idEpreuve}`;
    }
    return `${phase}_${journee}_${championshipType}`;
  }

  async getAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): Promise<DayAvailability | null> {
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(
        journee,
        phase,
        championshipType,
        idEpreuve
      );
      const docRef = db.collection(this.collectionName).doc(docId);
      const docSnap = await docRef.get();

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
        players: data.players || {},
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt?.toDate?.() || new Date(),
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : data.updatedAt?.toDate?.() || new Date(),
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
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(
        availability.journee,
        availability.phase,
        availability.championshipType,
        availability.idEpreuve
      );
      const docRef = db.collection(this.collectionName).doc(docId);

      const existingSnap = await docRef.get();
      const existingData = existingSnap.exists ? existingSnap.data() : null;

      console.log("[AvailabilityServiceAdmin] saveAvailability input", {
        docId,
        incomingPlayers: availability.players,
      });

      const sanitizedPlayers: PlayerAvailability = {};

      Object.entries(availability.players).forEach(([playerId, response]) => {
        const sanitized = sanitizeResponse(response);
        if (sanitized) {
          sanitizedPlayers[playerId] = sanitized;
        }
      });

      const createdAtTimestamp = availability.createdAt
        ? toTimestamp(availability.createdAt)
        : existingData?.createdAt
        ? toTimestamp(existingData.createdAt)
        : Timestamp.now();

      const dataToSave: Record<string, unknown> = {
        journee: availability.journee,
        phase: availability.phase,
        championshipType: availability.championshipType,
        players: sanitizedPlayers,
        updatedAt: Timestamp.now(),
        createdAt: createdAtTimestamp,
      };

      if (availability.date !== undefined) {
        dataToSave.date = availability.date;
      } else if (existingData?.date !== undefined) {
        dataToSave.date = existingData.date;
      }

      if (availability.idEpreuve !== undefined) {
        dataToSave.idEpreuve = availability.idEpreuve;
      }

      console.log("[AvailabilityServiceAdmin] sanitized players", {
        docId,
        players: sanitizedPlayers,
      });

      await docRef.set(dataToSave);
      console.log("[AvailabilityServiceAdmin] Saved availability document", {
        docId,
        dataToSave,
        playersKeys: Object.keys(sanitizedPlayers),
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la disponibilité:", error);
      throw error;
    }
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
      const availability = await this.getAvailability(
        journee,
        phase,
        championshipType,
        idEpreuve
      );

      const updatedAvailability: DayAvailability = {
        journee,
        phase,
        championshipType,
        ...(idEpreuve !== undefined ? { idEpreuve } : {}),
        players: {
          ...(availability?.players || {}),
          [playerId]: response,
        },
        createdAt: availability?.createdAt || new Date(),
      };

      await this.saveAvailability(updatedAvailability);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la disponibilité:",
        error
      );
      throw error;
    }
  }
}
