import { NextResponse } from "next/server";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
export async function POST(req: Request) {
  try {
    // Vérifier la configuration
    if (!DISCORD_LICENSE_CHANNEL_ID) {
      console.error("[Discord Link License] DISCORD_LICENSE_CHANNEL_ID non configuré");
      return NextResponse.json(
        { success: false, error: "Configuration manquante: DISCORD_LICENSE_CHANNEL_ID" },
        { status: 500 }
      );
    }

    // Authentification via secret partagé (optionnel mais recommandé)
    if (DISCORD_WEBHOOK_SECRET) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${DISCORD_WEBHOOK_SECRET}`) {
        return NextResponse.json(
          { success: false, error: "Non autorisé" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    const { channelId, userId, content, messageId } = body;

    // Vérifier que le message vient du bon canal
    if (channelId !== DISCORD_LICENSE_CHANNEL_ID) {
      console.log(`[Discord Link License] Message ignoré (canal ${channelId} != ${DISCORD_LICENSE_CHANNEL_ID})`);
      return NextResponse.json({ success: true, message: "Message ignoré (mauvais canal)" });
    }

    // Vérifier que le message n'est pas vide
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Contenu du message requis" },
        { status: 400 }
      );
    }

    // Nettoyer le message : trim et vérifier qu'il ne contient que des chiffres
    const trimmedContent = content.trim();
    
    // Vérifier que le message ne contient que des chiffres
    if (!/^\d+$/.test(trimmedContent)) {
      console.log(`[Discord Link License] Message ignoré (contient autre chose que des chiffres): "${trimmedContent}"`);
      return NextResponse.json({ success: true, message: "Message ignoré (doit contenir uniquement des chiffres)" });
    }

    const licenseNumber = trimmedContent;

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

      return NextResponse.json({
        success: false,
        error: "Utilisateur déjà associé à un joueur",
        existingLicense,
      });
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

      return NextResponse.json({
        success: false,
        error: "Licence non trouvée",
        licenseNumber,
      });
    }

    // 3. Ajouter l'ID Discord au joueur
    const playerData = playerDoc.data();
    const existingDiscordMentions = playerData?.discordMentions || [];
    
    // Vérifier que l'ID Discord n'est pas déjà dans la liste
    if (existingDiscordMentions.includes(userId)) {
      console.log(`[Discord Link License] Utilisateur ${userId} déjà dans la liste des mentions pour la licence ${licenseNumber}`);
      return NextResponse.json({
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

    return NextResponse.json({
      success: true,
      message: "Licence associée avec succès",
      licenseNumber,
      playerName: `${playerData?.prenom || ""} ${playerData?.nom || ""}`.trim(),
    });
  } catch (error) {
    console.error("[Discord Link License] Erreur:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'association de la licence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
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

