import type { NextRequest } from "next/server";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateString } from "@/lib/api/validation-helpers";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";

const DISCORD_LICENSE_CHANNEL_ID = process.env.DISCORD_LICENSE_CHANNEL_ID;
const DISCORD_WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;

/**
 * Route API pour lier un login Discord à un numéro de licence
 * 
 * Cette route est appelée lorsqu'un utilisateur envoie un message dans le canal Discord
 * configuré pour les licences. Le message doit contenir uniquement un numéro de licence.
 * 
 * Authentification: via secret partagé (DISCORD_WEBHOOK_SECRET)
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier la configuration
    if (!DISCORD_LICENSE_CHANNEL_ID) {
      console.error("[Discord Link License] DISCORD_LICENSE_CHANNEL_ID non configuré");
      return createErrorResponse("Configuration manquante: DISCORD_LICENSE_CHANNEL_ID", 500);
    }

    // Authentification via secret partagé (obligatoire)
    if (!DISCORD_WEBHOOK_SECRET) {
      console.error("[Discord Link License] DISCORD_WEBHOOK_SECRET non configuré");
      return createErrorResponse("Configuration manquante: DISCORD_WEBHOOK_SECRET", 500);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${DISCORD_WEBHOOK_SECRET}`) {
      return createErrorResponse("Non autorisé", 401);
    }

    const body = await req.json();
    const { channelId, userId, content, messageId } = body;

    // Rate limiting par userId (5 requêtes par 5 minutes)
    if (userId && typeof userId === "string") {
      const rateLimitError = withRateLimit({
        key: `discord-link-license:${userId}`,
        maxRequests: 5,
        windowMs: 5 * 60 * 1000,
        errorMessage: "Trop de tentatives. Veuillez patienter avant de réessayer.",
      });
      if (rateLimitError) return rateLimitError;
    }

    // Vérifier que le message vient du bon canal
    if (channelId !== DISCORD_LICENSE_CHANNEL_ID) {
      console.log(`[Discord Link License] Message ignoré (canal ${channelId} != ${DISCORD_LICENSE_CHANNEL_ID})`);
      return createSecureResponse({ success: true, message: "Message ignoré (mauvais canal)" });
    }

    // Vérifier que le message n'est pas vide
    const validatedContent = validateString(content, "content");
    if (validatedContent instanceof Response) return validatedContent;

    // Vérifier que le message ne contient que des chiffres
    if (!/^\d+$/.test(validatedContent)) {
      console.log(`[Discord Link License] Message ignoré (contient autre chose que des chiffres): "${validatedContent}"`);
      return createSecureResponse({ success: true, message: "Message ignoré (doit contenir uniquement des chiffres)" });
    }

    const licenseNumber = validatedContent;

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // 1. Vérifier si l'utilisateur Discord est déjà associé à un joueur
    // Utiliser array-contains pour chercher dans discordMentions
    const existingPlayerQuery = await db
      .collection("players")
      .where("discordMentions", "array-contains", userId)
      .limit(1)
      .get();

    if (!existingPlayerQuery.empty) {
      const existingLicense = existingPlayerQuery.docs[0].id;
      console.log(`[Discord Link License] Utilisateur ${userId} déjà associé à la licence ${existingLicense}`);
      
      // Envoyer un message d'erreur dans Discord
      await sendDiscordErrorMessage(
        channelId,
        messageId,
        `❌ Un utilisateur Discord ne peut être associé qu'à un seul joueur. Vous êtes déjà associé à la licence ${existingLicense}.`
      );

      return createErrorResponse(
        "Utilisateur déjà associé à un joueur",
        400,
        `Vous êtes déjà associé à la licence ${existingLicense}`
      );
    }

    // 2. Chercher le joueur par numéro de licence
    const playerDoc = await db.collection("players").doc(licenseNumber).get();

    if (!playerDoc.exists) {
      console.log(`[Discord Link License] Licence ${licenseNumber} non trouvée`);
      
      // Envoyer un message d'erreur dans Discord
      await sendDiscordErrorMessage(
        channelId,
        messageId,
        `❌ Aucun joueur trouvé avec la licence ${licenseNumber}. Vérifiez que le numéro de licence est correct.`
      );

      return createErrorResponse(
        "Licence non trouvée",
        404,
        `Aucun joueur trouvé avec la licence ${licenseNumber}`
      );
    }

    // 3. Ajouter l'ID Discord au joueur
    const playerData = playerDoc.data();
    const existingDiscordMentions = playerData?.discordMentions || [];
    
    // Vérifier que l'ID Discord n'est pas déjà dans la liste
    if (existingDiscordMentions.includes(userId)) {
      console.log(`[Discord Link License] Utilisateur ${userId} déjà dans la liste des mentions pour la licence ${licenseNumber}`);
      return createSecureResponse({
        success: true,
        message: "Utilisateur déjà associé à ce joueur",
        licenseNumber,
      });
    }

    // Ajouter l'ID Discord
    const updatedDiscordMentions = [...existingDiscordMentions, userId];

    await db.collection("players").doc(licenseNumber).update({
      discordMentions: updatedDiscordMentions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Discord Link License] Utilisateur ${userId} associé à la licence ${licenseNumber}`);

    // Envoyer un message de confirmation dans Discord
    await sendDiscordSuccessMessage(
      channelId,
      messageId,
      `✅ Votre compte Discord a été associé à la licence ${licenseNumber} (${playerData?.prenom || ""} ${playerData?.nom || ""}). Vous recevrez désormais les notifications pour ce joueur.`
    );

    return createSecureResponse({
      success: true,
      message: "Licence associée avec succès",
      licenseNumber,
      playerName: `${playerData?.prenom || ""} ${playerData?.nom || ""}`.trim(),
    });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/discord/link-license",
      defaultMessage: "Erreur lors de l'association de la licence",
    });
  }
}

/**
 * Envoie un message d'erreur dans Discord en réponse au message original
 */
async function sendDiscordErrorMessage(
  channelId: string,
  originalMessageId: string,
  errorMessage: string
): Promise<void> {
  try {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    if (!DISCORD_TOKEN) {
      console.error("[Discord Link License] DISCORD_TOKEN non configuré, impossible d'envoyer le message d'erreur");
      return;
    }

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: errorMessage,
        message_reference: {
          message_id: originalMessageId,
        },
      }),
    });
  } catch (error) {
    console.error("[Discord Link License] Erreur lors de l'envoi du message d'erreur:", error);
  }
}

/**
 * Envoie un message de succès dans Discord en réponse au message original
 */
async function sendDiscordSuccessMessage(
  channelId: string,
  originalMessageId: string,
  successMessage: string
): Promise<void> {
  try {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    if (!DISCORD_TOKEN) {
      console.error("[Discord Link License] DISCORD_TOKEN non configuré, impossible d'envoyer le message de succès");
      return;
    }

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: successMessage,
        message_reference: {
          message_id: originalMessageId,
        },
      }),
    });
  } catch (error) {
    console.error("[Discord Link License] Erreur lors de l'envoi du message de succès:", error);
  }
}

