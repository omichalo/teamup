import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { DiscordAvailabilityPoll } from "@/types/discord-availability";
import { ChampionshipType } from "@/types/championship";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION_NAME = "discordAvailabilityPolls";

export class DiscordPollServiceAdmin {
  /**
   * Génère l'ID du document pour un sondage
   */
  private getDocumentId(
    phase: "aller" | "retour",
    journee: number,
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): string {
    if (idEpreuve !== undefined) {
      return `${phase}_${journee}_${championshipType}_${idEpreuve}`;
    }
    return `${phase}_${journee}_${championshipType}`;
  }

  /**
   * Récupère un sondage par ses paramètres
   */
  async getPoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): Promise<DiscordAvailabilityPoll | null> {
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(phase, journee, championshipType, idEpreuve);
      const docRef = db.collection(COLLECTION_NAME).doc(docId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data();
      if (!data) {
        return null;
      }

      return {
        id: docSnap.id,
        messageId: data.messageId,
        channelId: data.channelId,
        journee: data.journee,
        phase: data.phase,
        championshipType: data.championshipType,
        idEpreuve: data.idEpreuve,
        date: data.date,
        isActive: data.isActive ?? true,
        closedAt: data.closedAt instanceof Timestamp
          ? data.closedAt.toDate()
          : data.closedAt?.toDate?.() || undefined,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt?.toDate?.() || new Date(),
        createdBy: data.createdBy || "",
      };
    } catch (error) {
      console.error("[DiscordPollServiceAdmin] Erreur lors de la récupération:", error);
      throw error;
    }
  }

  /**
   * Crée un nouveau sondage dans Firestore
   */
  async createPoll(poll: Omit<DiscordAvailabilityPoll, "id" | "createdAt">): Promise<string> {
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(
        poll.phase,
        poll.journee,
        poll.championshipType,
        poll.idEpreuve
      );
      const docRef = db.collection(COLLECTION_NAME).doc(docId);

      const dataToSave: Record<string, unknown> = {
        messageId: poll.messageId,
        channelId: poll.channelId,
        journee: poll.journee,
        phase: poll.phase,
        championshipType: poll.championshipType,
        isActive: poll.isActive ?? true,
        createdAt: Timestamp.now(),
        createdBy: poll.createdBy,
      };

      if (poll.idEpreuve !== undefined) {
        dataToSave.idEpreuve = poll.idEpreuve;
      }

      if (poll.date !== undefined) {
        dataToSave.date = poll.date;
      }

      if (poll.closedAt !== undefined) {
        dataToSave.closedAt = Timestamp.fromDate(poll.closedAt);
      }

      await docRef.set(dataToSave);
      return docId;
    } catch (error) {
      console.error("[DiscordPollServiceAdmin] Erreur lors de la création:", error);
      throw error;
    }
  }

  /**
   * Ferme un sondage (désactive les boutons)
   */
  async closePoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): Promise<void> {
    try {
      const db = getFirestoreAdmin();
      const docId = this.getDocumentId(phase, journee, championshipType, idEpreuve);
      const docRef = db.collection(COLLECTION_NAME).doc(docId);

      await docRef.set(
        {
          isActive: false,
          closedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("[DiscordPollServiceAdmin] Erreur lors de la fermeture:", error);
      throw error;
    }
  }
}

