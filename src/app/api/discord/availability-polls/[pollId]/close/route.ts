export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { ChampionshipType } from "@/types/championship";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * POST - Ferme un sondage Discord (désactive les boutons) et envoie un message optionnel
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ pollId: string }> }
) {
  try {
    const params = await context.params;

    // Vérifier l'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur est admin ou coach
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Admin ou Coach requis" },
        { status: 403 }
      );
    }

    if (!DISCORD_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Configuration Discord manquante" },
        { status: 500 }
      );
    }

    await initializeFirebaseAdmin();
    const pollService = new DiscordPollServiceAdmin();

    // Récupérer le sondage
    const parts = params.pollId.split("_");
    if (parts.length < 3) {
      return NextResponse.json(
        { success: false, error: "Format de pollId invalide" },
        { status: 400 }
      );
    }

    const phase = parts[0] as "aller" | "retour";
    const journee = parseInt(parts[1], 10);
    const championshipType = parts[2] as ChampionshipType;
    const idEpreuve = parts.length > 3 ? parseInt(parts[3], 10) : undefined;

    const poll = await pollService.getPoll(
      journee,
      phase,
      championshipType,
      idEpreuve
    );

    if (!poll) {
      return NextResponse.json(
        { success: false, error: "Sondage introuvable" },
        { status: 404 }
      );
    }

    if (!poll.isActive) {
      return NextResponse.json({
        success: true,
        message: "Le sondage est déjà fermé",
        poll,
      });
    }

    // Récupérer le messageTemplate optionnel depuis le body
    let messageTemplate: string | undefined;
    try {
      const body = await req.json();
      messageTemplate = body.messageTemplate;
    } catch {
      // Body vide ou invalide, pas de message personnalisé
    }

    // Récupérer la mention configurée pour ce type de championnat
    const { getFirestoreAdmin } = await import("@/lib/firebase-admin");
    const db = getFirestoreAdmin();
    const configDoc = await db
      .collection("discordAvailabilityConfig")
      .doc("default")
      .get();
    const config = configDoc.exists ? configDoc.data() : null;

    // Déterminer le type de championnat (par équipes ou Paris)
    // idEpreuve === 15980 = Championnat de Paris IDF (Excellence)
    // Sinon = Championnat de France par Équipes
    const isTeamChampionship = idEpreuve === undefined || idEpreuve !== 15980;
    const mention = isTeamChampionship
      ? config?.equipesMention || null
      : config?.parisMention || null;

    // Construire le message final (avec mention si fournie)
    const defaultCloseMessage =
      "Les inscriptions sont terminées pour cette journée.\n\nSi vous voulez vous ajoutez, il faut envoyer un message à Joffrey en privé.";
    let finalMessage =
      typeof messageTemplate === "string" && messageTemplate.trim().length > 0
        ? messageTemplate.trim()
        : defaultCloseMessage;

    // Ajouter "Bonjour {mention}" au début si la mention est configurée et qu'elle n'est pas déjà présente
    if (mention) {
      const bonjourWithMention = `Bonjour ${mention}`;
      const mentionAlreadyPresent =
        finalMessage.trim().startsWith(bonjourWithMention.trim()) ||
        finalMessage.trim().startsWith(mention.trim());
      if (!mentionAlreadyPresent) {
        finalMessage = `${bonjourWithMention}\n\n${finalMessage}`;
      }
    }

    // Envoyer le message dans le même channel
    const closeMessage = {
      content: finalMessage,
    };

    const sendMessageResponse = await fetch(
      `https://discord.com/api/v10/channels/${poll.channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(closeMessage),
      }
    );

    if (!sendMessageResponse.ok) {
      const errorText = await sendMessageResponse.text();
      console.error(
        "[Discord Poll Close] Erreur lors de l'envoi du message:",
        errorText
      );
      // Continuer quand même pour fermer le sondage
    }

    // Désactiver les boutons dans le message Discord
    const { buildAvailabilityPollMessage } = await import(
      "@/lib/discord/poll-builder"
    );
    const message = buildAvailabilityPollMessage(
      poll.id,
      poll.journee,
      poll.phase,
      poll.championshipType,
      poll.date
    );

    // Désactiver tous les boutons
    message.components.forEach((row) => {
      row.components.forEach((component) => {
        if (component.type === 2) {
          // BUTTON
          (component as { disabled?: boolean }).disabled = true;
        }
      });
    });

    // Mettre à jour le message Discord
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${poll.channelId}/messages/${poll.messageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error(
        "[Discord Poll Close] Erreur lors de la mise à jour:",
        errorText
      );
      // Continuer quand même pour fermer dans Firestore
    }

    // Fermer le sondage dans Firestore
    await pollService.closePoll(journee, phase, championshipType, idEpreuve);

    return NextResponse.json({
      success: true,
      message: "Sondage fermé avec succès",
    });
  } catch (error) {
    console.error("[Discord Poll Close] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la fermeture du sondage" },
      { status: 500 }
    );
  }
}
