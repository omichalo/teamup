import type { NextRequest } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

export const runtime = "nodejs";

const db = getFirestore();

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrCoach(req, true); // requireEmailVerified = true
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const teamIdsParam = searchParams.get("teamIds");
    const teamId = searchParams.get("teamId"); // Support de l'ancien format pour compatibilité
    const journee = searchParams.get("journee");
    const phase = searchParams.get("phase");

    if (!journee || !phase) {
      return createErrorResponse("journee et phase sont requis", 400);
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
      return createErrorResponse("teamIds ou teamId est requis", 400);
    }

    if (teamIds.length === 0) {
      return createErrorResponse("Au moins un teamId est requis", 400);
    }

    // Limiter le nombre de teamIds pour éviter l'énumération et les abus
    const MAX_TEAM_IDS = 50;
    if (teamIds.length > MAX_TEAM_IDS) {
      return createErrorResponse(`Maximum ${MAX_TEAM_IDS} teamIds autorisés`, 400);
    }

    // Valider que les teamIds sont des IDs valides (format attendu)
    // Empêcher l'injection de caractères malveillants
    const validTeamIdPattern = /^[a-zA-Z0-9_-]+$/;
    const invalidTeamIds = teamIds.filter(id => !validTeamIdPattern.test(id));
    if (invalidTeamIds.length > 0) {
      return createErrorResponse("Format de teamId invalide", 400);
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
      return createSecureResponse({
        success: true,
        sent: result.sent,
        sentAt: result.sentAt,
        customMessage: result.customMessage || "",
      });
    }

    // Nouveau format : retourner tous les résultats
    return createSecureResponse({ success: true, results });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/discord/check-message-sent",
      defaultMessage: "Erreur lors de la vérification",
    });
  }
}

