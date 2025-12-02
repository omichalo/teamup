import type { NextRequest } from "next/server";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateString } from "@/lib/api/validation-helpers";

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrCoach(req);
    if (auth instanceof Response) return auth;

    // Configuration du bot Discord
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      console.error("[Discord] Variables d'environnement manquantes:", {
        hasToken: !!DISCORD_TOKEN,
        hasServerId: !!DISCORD_SERVER_ID,
      });
      return createErrorResponse(
        "Configuration Discord manquante. DISCORD_TOKEN et DISCORD_SERVER_ID doivent être configurés.",
        500
      );
    }

    const { content, teamId, journee, phase, customMessage, channelId } =
      await req.json();

    const validatedContent = validateString(content, "content");
    if (validatedContent instanceof Response) return validatedContent;

    if (!teamId || journee === undefined || !phase) {
      return createErrorResponse("teamId, journee et phase sont requis", 400);
    }

    // Construire le message final avec le contenu personnalisé
    let finalContent = validatedContent;
    if (
      customMessage &&
      typeof customMessage === "string" &&
      customMessage.trim()
    ) {
      finalContent = `${validatedContent}\n${customMessage.trim()}`;
    }

    // Le channelId doit être fourni (configuré au niveau de l'équipe)
    if (!channelId) {
      return createErrorResponse(
        "channelId est requis pour envoyer le message. Configurez un canal Discord pour cette équipe dans la page des équipes.",
        400
      );
    }

    // Envoyer le message via le bot Discord
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: finalContent,
          allowed_mentions: {
            parse: ["users"], // Permet de mentionner les utilisateurs
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord] Erreur lors de l'envoi:", errorText);
      return createErrorResponse("Erreur lors de l'envoi du message Discord", 500, errorText);
    }

    // Enregistrer que le message a été envoyé
    try {
      const messageDoc = {
        teamId,
        journee: parseInt(journee, 10),
        phase,
        sentAt: Timestamp.now(),
        sentBy: auth.uid,
        customMessage: customMessage || "",
      };

      // Utiliser teamId, journee et phase comme ID unique pour éviter les doublons
      const messageId = `${teamId}_${journee}_${phase}`;
      await db
        .collection("discordMessages")
        .doc(messageId)
        .set(messageDoc, { merge: true });
    } catch (dbError) {
      console.error("[Discord] Erreur lors de l'enregistrement:", dbError);
      // Ne pas faire échouer l'envoi si l'enregistrement échoue
    }

    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/discord/send-message",
      defaultMessage: "Erreur lors de l'envoi du message",
    });
  }
}
