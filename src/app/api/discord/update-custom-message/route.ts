import type { NextRequest } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrCoach(req);
    if (auth instanceof Response) return auth;

    const { teamId, journee, phase, customMessage } = await req.json();

    if (!teamId || journee === undefined || !phase) {
      return createErrorResponse("teamId, journee et phase sont requis", 400);
    }

    // Sauvegarder le message personnalisé
    const messageId = `${teamId}_${journee}_${phase}`;
    const messageDoc = {
      teamId,
      journee: parseInt(journee, 10),
      phase,
      customMessage: customMessage || "",
      updatedAt: new Date(),
      updatedBy: auth.uid,
    };

    await db.collection("discordMessages").doc(messageId).set(messageDoc, { merge: true });

    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/discord/update-custom-message",
      defaultMessage: "Erreur lors de la mise à jour",
    });
  }
}

