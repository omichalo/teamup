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
    const { location } = await request.json();

    if (location !== null && location !== undefined && typeof location !== "string") {
      return createErrorResponse("Le lieu doit être une chaîne de caractères ou null", 400);
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return createErrorResponse("Équipe introuvable", 404);
    }

    // Si un lieu est fourni, vérifier qu'il existe
    if (location && location.trim() !== "") {
      const locationRef = db.collection("locations").doc(location.trim());
      const locationDoc = await locationRef.get();
      if (!locationDoc.exists) {
        return createErrorResponse("Lieu introuvable", 400);
      }
    }

    // Mettre à jour le lieu de l'équipe
    const updateData: { location?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (location === null || location === undefined || location.trim() === "") {
      updateData.location = null;
    } else {
      updateData.location = location.trim();
    }

    await teamRef.update(updateData);

    return createSecureResponse({
      success: true,
      data: {
        teamId,
        location: updateData.location || null,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/teams/[teamId]/location",
      defaultMessage: "Erreur lors de la mise à jour du lieu",
    });
  }
}

