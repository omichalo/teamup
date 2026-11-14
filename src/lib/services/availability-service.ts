import { doc, getDoc, Timestamp, onSnapshot, Unsubscribe } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { ChampionshipType } from "@/types";
import { getAvailabilityDocumentId } from "@/lib/availability/document-id";
import { patchAvailabilities } from "@/lib/availability/api-client";
import { normalizePlayersMap } from "@/lib/availability/normalize-players-map";
import { sanitizeAvailabilityResponse } from "@/lib/availability/sanitize-response";
import { seasonLabelFromDate } from "@/lib/championship/calendar-season-label";

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
  seasonLabel?: string;
  idEpreuve?: number; // ID de l'épreuve FFTT (15954, 15955, 15980, etc.) pour différencier les calendriers
  date?: string;
  players: PlayerAvailability;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AvailabilityService {
  private readonly collectionName = "availabilities";

  private resolveSeason(explicit?: string): string {
    return explicit?.trim() || seasonLabelFromDate(new Date());
  }

  private getDocumentId(
    seasonLabel: string,
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): string {
    return getAvailabilityDocumentId(
      seasonLabel,
      journee,
      phase,
      championshipType,
      idEpreuve
    );
  }

  async getAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string
  ): Promise<DayAvailability | null> {
    try {
      const resolvedSeason = this.resolveSeason(seasonLabel);
      const docId = this.getDocumentId(
        resolvedSeason,
        journee,
        phase,
        championshipType,
        idEpreuve
      );
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          journee: data.journee,
          phase: data.phase || phase,
          championshipType: data.championshipType,
          seasonLabel: data.seasonLabel ?? resolvedSeason,
          idEpreuve: data.idEpreuve,
          date: data.date,
          players: normalizePlayersMap(data),
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
      ...(availability.seasonLabel !== undefined
        ? { seasonLabel: availability.seasonLabel }
        : {}),
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
    idEpreuve?: number,
    seasonLabel?: string
  ): Promise<void> {
    try {
      const sanitized = sanitizeAvailabilityResponse(response);

      await patchAvailabilities({
        journee,
        phase,
        championshipType,
        ...(seasonLabel !== undefined ? { seasonLabel } : {}),
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
      const availability = await this.getAvailability(1, "aller", gender);

      if (!availability) {
        return true;
      }

      const playerAvailability = availability.players[playerId];
      return playerAvailability?.available ?? true;
    } catch (error) {
      console.error("Erreur lors de la vérification de disponibilité:", error);
      return true;
    }
  }

  subscribeToAvailability(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    callback: (availability: DayAvailability | null) => void,
    idEpreuve?: number,
    seasonLabel?: string
  ): Unsubscribe {
    try {
      const resolvedSeason = this.resolveSeason(seasonLabel);
      const docId = this.getDocumentId(
        resolvedSeason,
        journee,
        phase,
        championshipType,
        idEpreuve
      );
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
              seasonLabel: data.seasonLabel ?? resolvedSeason,
              idEpreuve: data.idEpreuve,
              date: data.date,
              players: normalizePlayersMap(data),
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
          callback(null);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error(
        "[AvailabilityService] Erreur lors de la création de l'abonnement:",
        error
      );
      return () => {
        // No-op
      };
    }
  }
}
