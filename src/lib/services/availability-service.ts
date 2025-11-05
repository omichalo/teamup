import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AvailabilityResponse {
  available: boolean;
  comment?: string;
}

export interface PlayerAvailability {
  [playerId: string]: AvailabilityResponse;
}

export interface DayAvailability {
  journee: number;
  phase: "aller" | "retour";
  championshipType: "masculin" | "feminin";
  date?: string;
  players: PlayerAvailability;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AvailabilityService {
  private readonly collectionName = "availabilities";

  private getDocumentId(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): string {
    return `${phase}_${journee}_${championshipType}`;
  }

  async getAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): Promise<DayAvailability | null> {
    try {
      const docId = this.getDocumentId(journee, phase, championshipType);
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          journee: data.journee,
          phase: data.phase || phase, // Fallback sur la phase passée en paramètre si absente
          championshipType: data.championshipType,
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
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération de la disponibilité:", error);
      throw error;
    }
  }

  async saveAvailability(availability: DayAvailability): Promise<void> {
    try {
      const docId = this.getDocumentId(
        availability.journee,
        availability.phase,
        availability.championshipType
      );
      const docRef = doc(db, this.collectionName, docId);

      const dataToSave: Record<string, any> = {
        journee: availability.journee,
        phase: availability.phase,
        championshipType: availability.championshipType,
        players: availability.players,
        updatedAt: Timestamp.fromDate(new Date()),
        createdAt: availability.createdAt
          ? availability.createdAt instanceof Date
            ? Timestamp.fromDate(availability.createdAt)
            : Timestamp.fromDate(new Date(availability.createdAt))
          : Timestamp.fromDate(new Date()),
      };

      // Ne pas inclure date s'il est undefined
      if (availability.date !== undefined) {
        dataToSave.date = availability.date;
      }

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la disponibilité:", error);
      throw error;
    }
  }

  async updatePlayerAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin",
    playerId: string,
    response: AvailabilityResponse
  ): Promise<void> {
    try {
      const availability = await this.getAvailability(journee, phase, championshipType);

      const updatedAvailability: DayAvailability = {
        journee,
        phase,
        championshipType,
        players: {
          ...(availability?.players || {}),
          [playerId]: response,
        },
        createdAt: availability?.createdAt || new Date(),
      };

      await this.saveAvailability(updatedAvailability);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la disponibilité:", error);
      throw error;
    }
  }

  async isPlayerAvailable(
    playerId: string,
    _date: string,
    gender: "masculin" | "feminin"
  ): Promise<boolean> {
    try {
      // Extraire journee et phase depuis la date
      // Pour simplifier, on suppose que la date est au format YYYY-MM-DD
      // et on récupère les disponibilités pour cette journée
      // Note: Cette méthode nécessite une logique plus complexe pour déterminer
      // la journée et la phase à partir de la date
      const availability = await this.getAvailability(
        1, // journee par défaut - à adapter selon la logique métier
        "aller", // phase par défaut - à adapter selon la logique métier
        gender
      );

      if (!availability) {
        return true; // Par défaut, le joueur est disponible si aucune donnée
      }

      const playerAvailability = availability.players[playerId];
      return playerAvailability?.available ?? true;
    } catch (error) {
      console.error("Erreur lors de la vérification de disponibilité:", error);
      return true; // Par défaut, on considère le joueur disponible en cas d'erreur
    }
  }
}