export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { buildAvailabilityPollMessage } from "@/lib/discord/poll-builder";
import { ChampionshipType } from "@/types/championship";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * POST - Crée un sondage Discord de disponibilité
 */
export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const {
      journee,
      phase,
      championshipType,
      idEpreuve,
      date,
      epreuveType,
      messageTemplate,
      fridayDate,
      saturdayDate,
    } = body;

    // Validation
    if (typeof journee !== "number" || journee < 1) {
      return NextResponse.json(
        { success: false, error: "journee doit être un nombre positif" },
        { status: 400 }
      );
    }

    if (phase !== "aller" && phase !== "retour") {
      return NextResponse.json(
        { success: false, error: "phase doit être 'aller' ou 'retour'" },
        { status: 400 }
      );
    }

    if (championshipType !== "masculin" && championshipType !== "feminin") {
      return NextResponse.json(
        { success: false, error: "championshipType doit être 'masculin' ou 'feminin'" },
        { status: 400 }
      );
    }

    await initializeFirebaseAdmin();
    const { getFirestoreAdmin } = await import("@/lib/firebase-admin");
    const db = getFirestoreAdmin();

    // Récupérer la configuration des channels Discord
    const configDoc = await db.collection("discordAvailabilityConfig").doc("default").get();
    if (!configDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Configuration Discord non trouvée. Configurez les channels dans l'administration." },
        { status: 400 }
      );
    }

    const config = configDoc.data();

    // Déterminer si c'est le championnat par équipes
    // epreuveType === "championnat_equipes" = Championnat de France par Équipes
    // epreuveType === "championnat_paris" ou idEpreuve === 15980 = Championnat de Paris IDF (Excellence)
    // Fallback : idEpreuve === 15954 ou 15955 = Championnat de France par Équipes
    const isTeamChampionship =
      epreuveType === "championnat_equipes" ||
      (idEpreuve !== undefined && idEpreuve !== 15980);

    // Déterminer le channel selon le type de championnat
    const targetChannelId = isTeamChampionship
      ? config?.equipesChannelId || null
      : config?.parisChannelId || null;

    if (!targetChannelId) {
      return NextResponse.json(
        {
          success: false,
          error: isTeamChampionship
            ? "Channel Discord non configuré pour le championnat par équipes. Configurez-le dans l'administration."
            : "Channel Discord non configuré pour le championnat de Paris. Configurez-le dans l'administration.",
        },
        { status: 400 }
      );
    }

    // Pour le championnat par équipes, créer un seul sondage (utiliser "masculin" comme type par défaut)
    // Le sondage contiendra les boutons pour masculin ET féminin
    const pollChampionshipTypeForCheck: ChampionshipType = isTeamChampionship
      ? "masculin"
      : (championshipType as ChampionshipType);

    // Vérifier si un sondage existe déjà
    const pollService = new DiscordPollServiceAdmin();
    const existingPoll = await pollService.getPoll(
      journee,
      phase,
      pollChampionshipTypeForCheck,
      idEpreuve
    );

    if (existingPoll && existingPoll.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Un sondage actif existe déjà pour cette journée, phase et championnat",
        },
        { status: 400 }
      );
    }

    // Pour le championnat par équipes, créer un seul sondage (utiliser "masculin" comme type par défaut)
    // Le sondage contiendra les boutons pour masculin ET féminin
    const pollChampionshipType: ChampionshipType = isTeamChampionship
      ? "masculin"
      : (championshipType as ChampionshipType);

    // Générer l'ID du sondage
    const pollId = existingPoll
      ? existingPoll.id
      : `${phase}_${journee}_${pollChampionshipType}${idEpreuve ? `_${idEpreuve}` : ""}`;

    // Construire le message Discord
    console.log("[Discord Poll Create] Création du sondage:", {
      pollId,
      journee,
      phase,
      pollChampionshipType,
      isTeamChampionship,
      idEpreuve,
      epreuveType,
      date,
    });
    const message = buildAvailabilityPollMessage(
      pollId,
      journee,
      phase,
      pollChampionshipType,
      date,
      isTeamChampionship,
      messageTemplate,
      fridayDate,
      saturdayDate
    );
    console.log("[Discord Poll Create] Message Discord construit:", {
      embedTitle: message.embeds[0]?.title,
      componentsCount: message.components.length,
      buttonsCount: message.components.reduce(
        (acc, row) => acc + row.components.length,
        0
      ),
    });

    // Envoyer le message Discord
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${targetChannelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("[Discord Poll] Erreur lors de l'envoi:", errorText);
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'envoi du message Discord" },
        { status: 500 }
      );
    }

    const messageData = await discordResponse.json();
    const messageId = messageData.id;

    // Créer le sondage dans Firestore
    await pollService.createPoll({
      messageId,
      channelId: targetChannelId,
      journee,
      phase,
      championshipType: pollChampionshipType,
      idEpreuve,
      date,
      isActive: true,
      createdBy: decoded.uid,
    });

    return NextResponse.json({
      success: true,
      poll: {
        id: pollId,
        messageId,
        channelId: targetChannelId,
        journee,
        phase,
        championshipType: pollChampionshipType,
        idEpreuve,
        date,
      },
    });
  } catch (error) {
    console.error("[Discord Poll Create] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création du sondage" },
      { status: 500 }
    );
  }
}

