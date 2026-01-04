export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { DiscordPollServiceAdmin } from "@/lib/services/discord-poll-service-admin";
import { ChampionshipType } from "@/types/championship";

/**
 * GET - Récupère les sondages Discord de disponibilité
 */
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const journee = searchParams.get("journee");
    const phase = searchParams.get("phase");
    const championshipType = searchParams.get("championshipType");
    const idEpreuve = searchParams.get("idEpreuve");

    await initializeFirebaseAdmin();
    const pollService = new DiscordPollServiceAdmin();

    // Si des paramètres sont fournis, récupérer un sondage spécifique
    if (journee && phase && championshipType) {
      const poll = await pollService.getPoll(
        parseInt(journee, 10),
        phase as "aller" | "retour",
        championshipType as ChampionshipType,
        idEpreuve ? parseInt(idEpreuve, 10) : undefined
      );

      return NextResponse.json({
        success: true,
        poll: poll || null,
      });
    }

    // Sinon, récupérer tous les sondages (pour l'historique)
    const { getFirestoreAdmin } = await import("@/lib/firebase-admin");
    const db = getFirestoreAdmin();
    const pollsSnapshot = await db
      .collection("discordAvailabilityPolls")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const polls = pollsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId,
        channelId: data.channelId,
        journee: data.journee,
        phase: data.phase,
        championshipType: data.championshipType,
        idEpreuve: data.idEpreuve,
        date: data.date,
        isActive: data.isActive ?? true,
        closedAt: data.closedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: data.createdBy || "",
      };
    });

    return NextResponse.json({
      success: true,
      polls,
    });
  } catch (error) {
    console.error("[Discord Polls GET] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des sondages" },
      { status: 500 }
    );
  }
}

