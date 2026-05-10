import { jsonNoStore } from "@/lib/http/cache-headers";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import {
  handleCommentButton,
  handleModalSubmit,
  handleModifyButton,
  handleRespondButton,
  DiscordMessageComponentInteraction,
  DiscordModalSubmitInteraction,
} from "@/lib/discord/poll-interactions";
import type { DiscordInteraction } from "./types";

export async function handleMessageComponentInteraction(data: DiscordInteraction) {
  await initializeFirebaseAdmin();
  const interaction = data as unknown as DiscordMessageComponentInteraction;
  const customId = interaction.data?.custom_id;
  const componentType = (interaction.data as { component_type?: number })
    ?.component_type;

  const interactionWithMetadata: DiscordMessageComponentInteraction = {
    ...interaction,
    application_id: data.application_id,
    token: data.token,
  } as DiscordMessageComponentInteraction;

  const interactionData = interaction.data as {
    values?: string[];
    component_type?: number;
    custom_id?: string;
  };

  console.log("[Discord Interactions] MESSAGE_COMPONENT received:", {
    customId,
    componentType,
    hasValues: !!interactionData.values,
    values: interactionData.values,
    fullInteractionData: JSON.stringify(interactionData),
    fullInteraction: JSON.stringify(interaction).substring(0, 500),
  });

  if (!customId || !customId.startsWith("availability_")) {
    return jsonNoStore({
      type: 4,
      data: { content: "❌ Interaction non reconnue.", flags: 64 },
    });
  }

  if (componentType === 3) {
    const parts = customId.split("_");
    if (parts.length < 3) {
      return jsonNoStore({
        type: 4,
        data: { content: "❌ Format d'interaction invalide.", flags: 64 },
      });
    }

    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    let pollId: string;
    let selectType: "paris" | "men" | "women_ven" | "women_sat" | null = null;

    if (
      lastPart === "select" &&
      secondLastPart !== "men" &&
      secondLastPart !== "ven" &&
      secondLastPart !== "sat"
    ) {
      pollId = parts.slice(1, -1).join("_");
      selectType = "paris";
    } else if (lastPart === "select" && secondLastPart === "men") {
      pollId = parts.slice(1, -2).join("_");
      selectType = "men";
    } else if (lastPart === "select" && secondLastPart === "ven") {
      pollId = parts.slice(1, -3).join("_");
      selectType = "women_ven";
    } else if (lastPart === "select" && secondLastPart === "sat") {
      pollId = parts.slice(1, -3).join("_");
      selectType = "women_sat";
    } else {
      return jsonNoStore({
        type: 4,
        data: { content: "❌ Format de select menu invalide.", flags: 64 },
      });
    }

    console.log("[Discord Interactions] Select menu detected:", {
      customId,
      pollId,
      selectType,
    });

    try {
      const { handleParisSelect, handleMenSelect, handleWomenSelect } =
        await import("@/lib/discord/poll-interactions");

      if (selectType === "paris") {
        return await handleParisSelect(interactionWithMetadata, pollId);
      }
      if (selectType === "men") {
        return await handleMenSelect(interactionWithMetadata, pollId);
      }
      if (selectType === "women_ven") {
        return await handleWomenSelect(interactionWithMetadata, pollId, "ven");
      }
      if (selectType === "women_sat") {
        return await handleWomenSelect(interactionWithMetadata, pollId, "sat");
      }

      return jsonNoStore({
        type: 4,
        data: { content: "❌ Type de select menu non reconnu.", flags: 64 },
      });
    } catch (error) {
      console.error(
        "[Discord Interactions] Erreur dans le handler select menu:",
        error
      );
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur lors du traitement. Veuillez réessayer.",
          flags: 64,
        },
      });
    }
  }

  const parts = customId.split("_");
  if (parts.length < 3) {
    return jsonNoStore({
      type: 4,
      data: { content: "❌ Format d'interaction invalide.", flags: 64 },
    });
  }

  const action = parts[parts.length - 1];
  const pollId = parts.slice(1, -1).join("_");

  if (!pollId || !action) {
    return jsonNoStore({
      type: 4,
      data: {
        content: "❌ Format d'interaction invalide (pollId ou action manquant).",
        flags: 64,
      },
    });
  }

  try {
    if (action === "respond") {
      return await handleRespondButton(interactionWithMetadata, pollId);
    }
    if (action === "modify") {
      return await handleModifyButton(interactionWithMetadata, pollId);
    }
    if (action === "comment") {
      return await handleCommentButton(interactionWithMetadata, pollId);
    }

    return jsonNoStore({
      type: 4,
      data: { content: "❌ Action non reconnue.", flags: 64 },
    });
  } catch (error) {
    console.error("[Discord Interactions] Erreur dans le handler:", error);
    return jsonNoStore({
      type: 4,
      data: {
        content: "❌ Erreur lors du traitement. Veuillez réessayer.",
        flags: 64,
      },
    });
  }
}

export async function handleModalSubmitInteraction(data: DiscordInteraction) {
  await initializeFirebaseAdmin();
  const interaction = data as unknown as DiscordModalSubmitInteraction;
  const customId = interaction.data?.custom_id;

  if (!customId) {
    return jsonNoStore({
      type: 4,
      data: { content: "❌ Modal non reconnu.", flags: 64 },
    });
  }

  if (
    customId.startsWith("availability_") &&
    customId.endsWith("_comment_modal")
  ) {
    const parts = customId.split("_");
    if (parts.length < 4) {
      return jsonNoStore({
        type: 4,
        data: { content: "❌ Format de modal invalide.", flags: 64 },
      });
    }

    const pollId = parts.slice(1, -2).join("_");
    if (!pollId) {
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Impossible d'extraire l'ID du sondage.",
          flags: 64,
        },
      });
    }

    try {
      return await handleModalSubmit(interaction, pollId);
    } catch (error) {
      console.error(
        "[Discord Interactions] Erreur dans handleModalSubmit:",
        error
      );
      return jsonNoStore({
        type: 4,
        data: {
          content: "❌ Erreur lors du traitement. Veuillez réessayer.",
          flags: 64,
        },
      });
    }
  }

  return jsonNoStore({
    type: 4,
    data: { content: "❌ Modal non reconnu.", flags: 64 },
  });
}
