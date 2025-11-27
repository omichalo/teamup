import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

const db = getFirestore();

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
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const teamIdsParam = searchParams.get("teamIds");
    const teamId = searchParams.get("teamId"); // Support de l'ancien format pour compatibilité
    const journee = searchParams.get("journee");
    const phase = searchParams.get("phase");

    if (!journee || !phase) {
      return NextResponse.json(
        { success: false, error: "journee et phase sont requis" },
        { status: 400 }
      );
    }

    // Déterminer la liste des teamIds à vérifier
    let teamIds: string[] = [];
    if (teamIdsParam) {
      // Nouveau format : plusieurs teamIds séparés par des virgules
      teamIds = teamIdsParam.split(",").map(id => id.trim()).filter(Boolean);
    } else if (teamId) {
      // Ancien format : un seul teamId (rétrocompatibilité)
      teamIds = [teamId];
    } else {
      return NextResponse.json(
        { success: false, error: "teamIds ou teamId est requis" },
        { status: 400 }
      );
    }

    if (teamIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Au moins un teamId est requis" },
        { status: 400 }
      );
    }

    // Limiter le nombre de teamIds pour éviter l'énumération et les abus
    const MAX_TEAM_IDS = 50;
    if (teamIds.length > MAX_TEAM_IDS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_TEAM_IDS} teamIds autorisés` },
        { status: 400 }
      );
    }

    // Valider que les teamIds sont des IDs valides (format attendu)
    // Empêcher l'injection de caractères malveillants
    const validTeamIdPattern = /^[a-zA-Z0-9_-]+$/;
    const invalidTeamIds = teamIds.filter(id => !validTeamIdPattern.test(id));
    if (invalidTeamIds.length > 0) {
      return NextResponse.json(
        { success: false, error: "Format de teamId invalide" },
        { status: 400 }
      );
    }

    const journeeNum = parseInt(journee, 10);
    const results: Record<string, { sent: boolean; sentAt?: string; customMessage?: string }> = {};

    // Pour chaque équipe, vérifier le statut du message
    await Promise.all(
      teamIds.map(async (tid) => {
        // Vérifier si un message a déjà été envoyé pour ce match
        const messageRef = db
          .collection("discordMessages")
          .where("teamId", "==", tid)
          .where("journee", "==", journeeNum)
          .where("phase", "==", phase)
          .limit(1);

        const snapshot = await messageRef.get();
        const hasBeenSent = !snapshot.empty;

        if (hasBeenSent) {
          const messageData = snapshot.docs[0].data();
          results[tid] = {
            sent: true,
            sentAt: messageData.sentAt?.toDate?.()?.toISOString() || messageData.sentAt,
            customMessage: messageData.customMessage || "",
          };
        } else {
          // Même si le message n'a pas été envoyé, vérifier s'il y a un message personnalisé sauvegardé
          const messageId = `${tid}_${journeeNum}_${phase}`;
          const messageDoc = await db.collection("discordMessages").doc(messageId).get();
          
          if (messageDoc.exists) {
            const messageData = messageDoc.data();
            results[tid] = {
              sent: false,
              customMessage: messageData?.customMessage || "",
            };
          } else {
            results[tid] = {
              sent: false,
              customMessage: "",
            };
          }
        }
      })
    );

    // Si un seul teamId était demandé (ancien format), retourner le format simple pour compatibilité
    if (teamIds.length === 1 && teamId) {
      const result = results[teamIds[0]];
      return NextResponse.json({
        success: true,
        sent: result.sent,
        sentAt: result.sentAt,
        customMessage: result.customMessage || "",
      });
    }

    // Nouveau format : retourner tous les résultats
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Discord] Erreur lors de la vérification:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}

