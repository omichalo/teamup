import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { ChampionshipType } from "@/types/championship";
import type { SelectMenuOption } from "./poll-interactions-types";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

export async function updateEphemeralMessage(
  applicationId: string,
  interactionToken: string,
  content: string,
  components: Array<{
    type: number;
    components: Array<{
      type: number;
      custom_id: string;
      options?: Array<{
        label: string;
        value: string;
        emoji?: { name: string };
        default?: boolean;
      }>;
      placeholder?: string;
      disabled?: boolean;
    }>;
  }>
): Promise<void> {
  if (!DISCORD_TOKEN) {
    console.warn(
      "[Discord Poll] DISCORD_TOKEN non configuré, impossible de mettre à jour le message"
    );
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          components,
          flags: 64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        console.warn(
          "[Discord Poll] Token d'interaction expiré (normal si le traitement prend > 3s). La donnée est sauvegardée dans Firestore."
        );
        return;
      }
      console.error(
        "[Discord Poll] Erreur lors de la mise à jour du message:",
        errorText
      );
    }
  } catch (error) {
    console.warn(
      "[Discord Poll] Erreur réseau lors de la mise à jour du message:",
      error
    );
  }
}

export async function findPlayerByDiscordId(
  discordUserId: string
): Promise<{ playerId: string; playerData: Record<string, unknown> } | null> {
  await initializeFirebaseAdmin();
  const db = getFirestoreAdmin();
  const playersQuery = await db
    .collection("players")
    .where("discordMentions", "array-contains", discordUserId)
    .limit(1)
    .get();

  if (playersQuery.empty) {
    return null;
  }

  const doc = playersQuery.docs[0];
  return {
    playerId: doc.id,
    playerData: doc.data(),
  };
}

export async function checkPollActive(pollId: string): Promise<{
  active: boolean;
  poll: Awaited<ReturnType<DiscordPollServiceAdmin["getPoll"]>> | null;
}> {
  await initializeFirebaseAdmin();
  const parts = pollId.split("_");
  if (parts.length < 3) return { active: false, poll: null };

  const phase = parts[0] as "aller" | "retour";
  const journee = parseInt(parts[1], 10);
  if (isNaN(journee)) return { active: false, poll: null };

  const championshipType = parts[2] as ChampionshipType;
  const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

  const pollService = new DiscordPollServiceAdmin();
  const poll = await pollService.getPoll(
    journee,
    phase,
    championshipType,
    idEpreuve
  );

  return { active: poll?.isActive ?? false, poll };
}

export function createSelectOptions(
  includeUnset: boolean,
  currentValue?: boolean
): SelectMenuOption[] {
  const options: SelectMenuOption[] = [
    {
      label: "Disponible",
      value: "available",
      emoji: { name: "✅" },
      default: currentValue === true,
    },
    {
      label: "Indisponible",
      value: "unavailable",
      emoji: { name: "❌" },
      default: currentValue === false,
    },
  ];

  if (includeUnset) {
    options.push({
      label: "Non renseigné",
      value: "unset",
      emoji: { name: "❓" },
      default: currentValue === undefined,
    });
  }

  return options;
}
