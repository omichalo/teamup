import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { DiscordAvailabilityPoll } from "@/types/discord-availability";
import { ChampionshipType } from "@/types/championship";
import { Timestamp } from "firebase-admin/firestore";
import { getDiscordPollDocumentId } from "@/lib/discord/poll-document-id";
import { seasonLabelFromDate } from "@/lib/championship/calendar-season-label";
import { readPublishedSeasonLabel } from "@/lib/championship/season-label";

const COLLECTION_NAME = "discordAvailabilityPolls";

function mapPollDoc(
  id: string,
  data: Record<string, unknown>
): DiscordAvailabilityPoll {
  const closedAt = data.closedAt;
  const createdAt = data.createdAt;
  return {
    id,
    messageId: String(data.messageId ?? ""),
    channelId: String(data.channelId ?? ""),
    journee: Number(data.journee),
    phase: data.phase as "aller" | "retour",
    championshipType: data.championshipType as ChampionshipType,
    ...(typeof data.seasonLabel === "string"
      ? { seasonLabel: data.seasonLabel }
      : {}),
    ...(typeof data.idEpreuve === "number"
      ? { idEpreuve: data.idEpreuve }
      : {}),
    ...(typeof data.date === "string" ? { date: data.date } : {}),
    isActive: data.isActive !== false,
    ...(closedAt instanceof Timestamp
      ? { closedAt: closedAt.toDate() }
      : {}),
    createdAt:
      createdAt instanceof Timestamp
        ? createdAt.toDate()
        : new Date(),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
  };
}

export class DiscordPollServiceAdmin {
  private getDocumentId(
    phase: "aller" | "retour",
    journee: number,
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string | null
  ): string {
    return getDiscordPollDocumentId({
      phase,
      journee,
      championshipType,
      ...(seasonLabel !== undefined ? { seasonLabel } : {}),
      ...(idEpreuve !== undefined ? { idEpreuve } : {}),
    });
  }

  async resolveSeasonLabel(explicit?: string | null): Promise<string> {
    if (explicit?.trim()) {
      return explicit.trim();
    }
    try {
      const db = getFirestoreAdmin();
      return await readPublishedSeasonLabel(db);
    } catch {
      return seasonLabelFromDate(new Date());
    }
  }

  private async readById(docId: string): Promise<DiscordAvailabilityPoll | null> {
    const db = getFirestoreAdmin();
    const docSnap = await db.collection(COLLECTION_NAME).doc(docId).get();
    if (!docSnap.exists) {
      return null;
    }
    const data = docSnap.data();
    if (!data) {
      return null;
    }
    return mapPollDoc(docSnap.id, data as Record<string, unknown>);
  }

  /**
   * Récupère un sondage : ID saisonné d'abord, puis fallback legacy (sondage déjà lancé).
   */
  async getPoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string | null
  ): Promise<DiscordAvailabilityPoll | null> {
    try {
      const resolvedSeason = await this.resolveSeasonLabel(seasonLabel);
      const seasonalId = this.getDocumentId(
        phase,
        journee,
        championshipType,
        idEpreuve,
        resolvedSeason
      );
      const seasonal = await this.readById(seasonalId);
      if (seasonal) {
        return seasonal;
      }

      const legacyId = this.getDocumentId(
        phase,
        journee,
        championshipType,
        idEpreuve,
        null
      );
      return await this.readById(legacyId);
    } catch (error) {
      console.error(
        "[DiscordPollServiceAdmin] Erreur lors de la récupération:",
        error
      );
      throw error;
    }
  }

  async getPollByDocumentId(
    pollId: string
  ): Promise<DiscordAvailabilityPoll | null> {
    try {
      return await this.readById(pollId);
    } catch (error) {
      console.error(
        "[DiscordPollServiceAdmin] Erreur getPollByDocumentId:",
        error
      );
      throw error;
    }
  }

  async createPoll(
    poll: Omit<DiscordAvailabilityPoll, "id" | "createdAt">
  ): Promise<string> {
    try {
      const db = getFirestoreAdmin();
      const seasonLabel = await this.resolveSeasonLabel(poll.seasonLabel);
      const docId = this.getDocumentId(
        poll.phase,
        poll.journee,
        poll.championshipType,
        poll.idEpreuve,
        seasonLabel
      );
      const docRef = db.collection(COLLECTION_NAME).doc(docId);

      const dataToSave: Record<string, unknown> = {
        messageId: poll.messageId,
        channelId: poll.channelId,
        journee: poll.journee,
        phase: poll.phase,
        championshipType: poll.championshipType,
        seasonLabel,
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
      console.error(
        "[DiscordPollServiceAdmin] Erreur lors de la création:",
        error
      );
      throw error;
    }
  }

  async getActivePolls(): Promise<DiscordAvailabilityPoll[]> {
    try {
      const db = getFirestoreAdmin();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where("isActive", "==", true)
        .get();

      const polls: DiscordAvailabilityPoll[] = [];
      snapshot.forEach((docSnap) => {
        polls.push(mapPollDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
      });

      return polls;
    } catch (error) {
      console.error(
        "[DiscordPollServiceAdmin] Erreur lors de la récupération des sondages actifs:",
        error
      );
      throw error;
    }
  }

  async closePoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string | null
  ): Promise<void> {
    try {
      const db = getFirestoreAdmin();
      const poll = await this.getPoll(
        journee,
        phase,
        championshipType,
        idEpreuve,
        seasonLabel
      );
      if (!poll) {
        return;
      }

      await db.collection(COLLECTION_NAME).doc(poll.id).set(
        {
          isActive: false,
          closedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        "[DiscordPollServiceAdmin] Erreur lors de la fermeture:",
        error
      );
      throw error;
    }
  }
}
