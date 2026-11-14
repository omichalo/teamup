import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { DiscordAvailabilityPoll } from "@/types/discord-availability";
import { ChampionshipType } from "@/types/championship";
import { getDiscordPollDocumentId } from "@/lib/discord/poll-document-id";
import { seasonLabelFromDate } from "@/lib/championship/calendar-season-label";

const COLLECTION_NAME = "discordAvailabilityPolls";

function mapPoll(
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
      createdAt instanceof Timestamp ? createdAt.toDate() : new Date(),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
  };
}

export class DiscordPollService {
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

  private async readById(docId: string): Promise<DiscordAvailabilityPoll | null> {
    const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return mapPoll(docSnap.id, docSnap.data() as Record<string, unknown>);
  }

  async getPoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string | null
  ): Promise<DiscordAvailabilityPoll | null> {
    try {
      const resolvedSeason = seasonLabel?.trim() || seasonLabelFromDate(new Date());
      const seasonal = await this.readById(
        this.getDocumentId(
          phase,
          journee,
          championshipType,
          idEpreuve,
          resolvedSeason
        )
      );
      if (seasonal) {
        return seasonal;
      }
      return await this.readById(
        this.getDocumentId(phase, journee, championshipType, idEpreuve, null)
      );
    } catch (error) {
      console.error("[DiscordPollService] Erreur lors de la récupération:", error);
      throw error;
    }
  }

  async createPoll(
    poll: Omit<DiscordAvailabilityPoll, "id" | "createdAt">
  ): Promise<string> {
    try {
      const seasonLabel =
        poll.seasonLabel?.trim() || seasonLabelFromDate(new Date());
      const docId = this.getDocumentId(
        poll.phase,
        poll.journee,
        poll.championshipType,
        poll.idEpreuve,
        seasonLabel
      );
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, docId);

      const dataToSave: Record<string, unknown> = {
        messageId: poll.messageId,
        channelId: poll.channelId,
        journee: poll.journee,
        phase: poll.phase,
        championshipType: poll.championshipType,
        seasonLabel,
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

  async closePoll(
    journee: number,
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number,
    seasonLabel?: string | null
  ): Promise<void> {
    try {
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
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, poll.id);
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
