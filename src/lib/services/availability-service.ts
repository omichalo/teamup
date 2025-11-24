import { doc, getDoc, setDoc, Timestamp, onSnapshot, Unsubscribe } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

export interface AvailabilityResponse {
  available?: boolean;
  comment?: string;
}

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

  if (sanitized.available === undefined && sanitized.comment === undefined) {
    return undefined;
  }

  return sanitized;
};

const toTimestamp = (value: unknown | Date | Timestamp | undefined): Timestamp => {
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

  return Timestamp.fromDate(new Date());
};

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
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
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
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      const existingSnap = await getDoc(docRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;

      console.log("[AvailabilityService] saveAvailability input", {
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
        : Timestamp.fromDate(new Date());

      const dataToSave: Record<string, unknown> = {
        journee: availability.journee,
        phase: availability.phase,
        championshipType: availability.championshipType,
        players: sanitizedPlayers,
        updatedAt: Timestamp.fromDate(new Date()),
        createdAt: createdAtTimestamp,
      };

      if (availability.date !== undefined) {
        dataToSave.date = availability.date;
      } else if (existingData?.date !== undefined) {
        dataToSave.date = existingData.date;
      }

      console.log("[AvailabilityService] sanitized players", {
        docId,
        players: sanitizedPlayers,
      });

      await setDoc(docRef, dataToSave);
      console.log("[AvailabilityService] Saved availability document", {
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

  /**
   * S'abonne aux changements de disponibilité en temps réel
   * @param journee - Numéro de la journée
   * @param phase - Phase du championnat (aller/retour)
   * @param championshipType - Type de championnat (masculin/feminin)
   * @param callback - Fonction appelée à chaque changement
   * @returns Fonction pour se désabonner
   */
  subscribeToAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin",
    callback: (availability: DayAvailability | null) => void
  ): Unsubscribe {
    try {
      const docId = this.getDocumentId(journee, phase, championshipType);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const availability: DayAvailability = {
              journee: data.journee,
              phase: data.phase || phase,
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
            callback(availability);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(
            `[AvailabilityService] Erreur lors de l'écoute de la disponibilité (${docId}):`,
            error
          );
          // En cas d'erreur, on appelle le callback avec null pour indiquer qu'il n'y a pas de données
          callback(null);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error(
        "[AvailabilityService] Erreur lors de la création de l'abonnement:",
        error
      );
      // Retourner une fonction no-op en cas d'erreur
      return () => {
        // No-op
      };
    }
  }
}