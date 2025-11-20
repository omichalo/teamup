import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

export async function POST(req: Request) {
  try {
    // Configuration du bot Discord (vérifier à l'intérieur de la fonction)
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      console.error("[Discord] Variables d'environnement manquantes:", {
        hasToken: !!DISCORD_TOKEN,
        hasServerId: !!DISCORD_SERVER_ID,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Configuration Discord manquante. DISCORD_TOKEN et DISCORD_SERVER_ID doivent être configurés.",
        },
        { status: 500 }
      );
    }

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
    const role = decoded.role || "player";

    // Seuls les admins et coaches peuvent envoyer des messages Discord
    if (role !== "admin" && role !== "coach") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { content, teamId, journee, phase, customMessage, channelId } =
      await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Le contenu du message est requis" },
        { status: 400 }
      );
    }

    if (!teamId || journee === undefined || !phase) {
      return NextResponse.json(
        { success: false, error: "teamId, journee et phase sont requis" },
        { status: 400 }
      );
    }

    // Construire le message final avec le contenu personnalisé
    let finalContent = content;
    if (
      customMessage &&
      typeof customMessage === "string" &&
      customMessage.trim()
    ) {
      finalContent = `${content}\n${customMessage.trim()}`;
    }

    // Le channelId doit être fourni (configuré au niveau de l'équipe)
    if (!channelId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "channelId est requis pour envoyer le message. Configurez un canal Discord pour cette équipe dans la page des équipes.",
        },
        { status: 400 }
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
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'envoi du message Discord" },
        { status: 500 }
      );
    }

    // Enregistrer que le message a été envoyé
    try {
      const messageDoc = {
        teamId,
        journee: parseInt(journee, 10),
        phase,
        sentAt: Timestamp.now(),
        sentBy: decoded.uid,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Discord] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
