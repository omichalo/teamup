import { doc, getDoc, Timestamp, onSnapshot, Unsubscribe } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { ChampionshipType } from "@/types";
import { getAvailabilityDocumentId } from "@/lib/availability/document-id";
import { patchAvailabilities } from "@/lib/availability/api-client";
import { sanitizeAvailabilityResponse } from "@/lib/availability/sanitize-response";

export interface AvailabilityResponse {
  available?: boolean;
  comment?: string;
  // Disponibilités par date pour les filles (vendredi/samedi)
  fridayAvailable?: boolean;
  saturdayAvailable?: boolean;
}

export interface PlayerAvailability {
  [playerId: string]: AvailabilityResponse;
}

export interface DayAvailability {
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number; // ID de l'épreuve FFTT (15954, 15955, 15980, etc.) pour différencier les calendriers
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
      const docId = this.getDocumentId(journee, phase, championshipType, idEpreuve);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          journee: data.journee,
          phase: data.phase || phase, // Fallback sur la phase passée en paramètre si absente
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
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération de la disponibilité:", error);
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

    await patchAvailabilities({
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
      const sanitized = sanitizeAvailabilityResponse(response);

      await patchAvailabilities({
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
      console.error("Erreur lors de la mise à jour de la disponibilité:", error);
      throw error;
    }
  }

  async isPlayerAvailable(
    playerId: string,
    _date: string,
    gender: ChampionshipType
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
    championshipType: ChampionshipType,
    callback: (availability: DayAvailability | null) => void,
    idEpreuve?: number
  ): Unsubscribe {
    try {
      const docId = this.getDocumentId(journee, phase, championshipType, idEpreuve);
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
