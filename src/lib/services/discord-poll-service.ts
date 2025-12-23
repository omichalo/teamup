import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { DiscordAvailabilityPoll } from "@/types/discord-availability";
import { ChampionshipType } from "@/types/championship";

const COLLECTION_NAME = "discordAvailabilityPolls";

export class DiscordPollService {
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
      const docId = this.getDocumentId(phase, journee, championshipType, idEpreuve);
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
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
        closedAt: data.closedAt
          ? data.closedAt instanceof Timestamp
            ? data.closedAt.toDate()
            : data.closedAt.toDate?.() || undefined
          : undefined,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt?.toDate?.() || new Date(),
        createdBy: data.createdBy || "",
      };
    } catch (error) {
      console.error("[DiscordPollService] Erreur lors de la récupération:", error);
      throw error;
    }
  }

  /**
   * Crée un nouveau sondage dans Firestore
   */
  async createPoll(poll: Omit<DiscordAvailabilityPoll, "id" | "createdAt">): Promise<string> {
    try {
      const docId = this.getDocumentId(
        poll.phase,
        poll.journee,
        poll.championshipType,
        poll.idEpreuve
      );
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, docId);

      const dataToSave: Record<string, unknown> = {
        messageId: poll.messageId,
        channelId: poll.channelId,
        journee: poll.journee,
        phase: poll.phase,
        championshipType: poll.championshipType,
        isActive: poll.isActive ?? true,
        createdAt: Timestamp.fromDate(new Date()),
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

      await setDoc(docRef, dataToSave);
      return docId;
    } catch (error) {
      console.error("[DiscordPollService] Erreur lors de la création:", error);
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
      const docId = this.getDocumentId(phase, journee, championshipType, idEpreuve);
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, docId);

      await setDoc(
        docRef,
        {
          isActive: false,
          closedAt: Timestamp.fromDate(new Date()),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("[DiscordPollService] Erreur lors de la fermeture:", error);
      throw error;
    }
  }
}

