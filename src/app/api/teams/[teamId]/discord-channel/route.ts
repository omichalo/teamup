import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateId } from "@/lib/api/validation-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const auth = await requireAdminOrCoach(request);
    if (auth instanceof Response) return auth;

    const { teamId } = await params;
    
    const idError = validateId(teamId, "teamId");
    if (idError) return idError;
    const { discordChannelId } = await request.json();

    if (discordChannelId !== null && discordChannelId !== undefined && typeof discordChannelId !== "string") {
      return createErrorResponse("Le canal Discord doit être une chaîne de caractères ou null", 400);
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return createErrorResponse("Équipe introuvable", 404);
    }

    // Mettre à jour le canal Discord de l'équipe
    const updateData: { discordChannelId?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (discordChannelId === null || discordChannelId === undefined || discordChannelId.trim() === "") {
      updateData.discordChannelId = null;
    } else {
      updateData.discordChannelId = discordChannelId.trim();
    }

    await teamRef.update(updateData);

    return createSecureResponse({
      success: true,
      data: {
        teamId,
        discordChannelId: updateData.discordChannelId || null,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/teams/[teamId]/discord-channel",
      defaultMessage: "Erreur lors de la mise à jour du canal Discord",
    });
  }
}

