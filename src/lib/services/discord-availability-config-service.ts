import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { DiscordAvailabilityConfig } from "@/types/discord-availability";

const COLLECTION_NAME = "discordAvailabilityConfig";
const DOCUMENT_ID = "default";

export class DiscordAvailabilityConfigService {
  /**
   * Récupère la configuration des channels Discord
   */
  async getConfig(): Promise<DiscordAvailabilityConfig | null> {
    try {
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, DOCUMENT_ID);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        parisChannelId: data.parisChannelId || undefined,
        equipesChannelId: data.equipesChannelId || undefined,
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : data.updatedAt?.toDate?.() || new Date(),
        updatedBy: data.updatedBy || "",
      };
    } catch (error) {
      console.error(
        "[DiscordAvailabilityConfigService] Erreur lors de la récupération de la config:",
        error
      );
      throw error;
    }
  }

  /**
   * Sauvegarde la configuration des channels Discord
   */
  async saveConfig(
    config: Omit<DiscordAvailabilityConfig, "updatedAt" | "updatedBy">,
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(getDbInstanceDirect(), COLLECTION_NAME, DOCUMENT_ID);

      const dataToSave: Record<string, unknown> = {
        parisChannelId: config.parisChannelId || null,
        equipesChannelId: config.equipesChannelId || null,
        updatedAt: Timestamp.fromDate(new Date()),
        updatedBy,
      };

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error(
        "[DiscordAvailabilityConfigService] Erreur lors de la sauvegarde de la config:",
        error
      );
      throw error;
    }
  }
}

