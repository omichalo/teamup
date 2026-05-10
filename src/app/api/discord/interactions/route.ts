export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { verifyDiscordSignature } from "./signature";
import { InteractionType, type DiscordInteraction } from "./types";
import {
  handleGetLicenseCommand,
  handleLinkLicenseCommand,
  handleUnlinkLicenseCommand,
  handleUpdateLicenseCommand,
} from "./command-handlers";
import {
  handleMessageComponentInteraction,
  handleModalSubmitInteraction,
} from "./component-handlers";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

function unknownCommandResponse(commandName?: string) {
  return jsonNoStore({
    type: 4,
    data: {
      content: `❌ Commande inconnue : ${commandName || "N/A"}`,
      flags: 64,
    },
  });
}

async function handleApplicationCommand(data: DiscordInteraction) {
  const commandName = data.data?.name;

  if (commandName === "lier_licence" || commandName === "link_license") {
    return handleLinkLicenseCommand(data);
  }
  if (commandName === "modifier_licence" || commandName === "update_license") {
    return handleUpdateLicenseCommand(data);
  }
  if (
    commandName === "supprimer_licence" ||
    commandName === "unlink_license"
  ) {
    return handleUnlinkLicenseCommand(data);
  }
  if (
    commandName === "ma_licence" ||
    commandName === "my_license" ||
    commandName === "voir_licence" ||
    commandName === "view_license"
  ) {
    return handleGetLicenseCommand(data);
  }

  return unknownCommandResponse(commandName);
}

export async function POST(req: Request) {
  try {
    if (!DISCORD_PUBLIC_KEY) {
      console.error("[Discord Interactions] DISCORD_PUBLIC_KEY non configuré");
      return jsonNoStore({ error: "Server misconfiguration" }, { status: 500 });
    }

    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const body = await req.text();

    if (!signature || !timestamp) {
      console.error("[Discord Interactions] Headers de signature manquants");
      return jsonNoStore({ error: "Invalid signature" }, { status: 401 });
    }

    const isValid = verifyDiscordSignature(
      body,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );
    if (!isValid) {
      console.error("[Discord Interactions] Signature invalide");
      return jsonNoStore({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body) as DiscordInteraction;

    switch (data.type) {
      case InteractionType.PING:
        return jsonNoStore({ type: InteractionType.PING });
      case InteractionType.APPLICATION_COMMAND:
        return handleApplicationCommand(data);
      case InteractionType.MESSAGE_COMPONENT:
        return handleMessageComponentInteraction(data);
      case InteractionType.MODAL_SUBMIT:
        return handleModalSubmitInteraction(data);
      default:
        return jsonNoStore(
          { error: "Unknown interaction type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Discord Interactions] Erreur:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Discord Interactions] Détails:", errorMessage);
    return jsonNoStore(
      {
        error: "Erreur lors du traitement de l'interaction",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
