export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
  adminAuth,
} from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // CSRF Protection
    if (!validateOrigin(request)) {
      return jsonNoStore(
        { success: false, error: "Invalid origin" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore(
        {
          error: "Token d'authentification requis",
          message: "Cette API nécessite une authentification valide",
        },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore(
        {
          error: "Accès refusé",
          message:
            "Cette opération est réservée aux administrateurs et coachs",
        },
        { status: 403 }
      );
    }

    const { teamId } = await params;
    const { location } = await request.json();

    if (location !== null && location !== undefined && typeof location !== "string") {
      return jsonNoStore(
        {
          error: "Le lieu doit être une chaîne de caractères ou null",
        },
        { status: 400 }
      );
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return jsonNoStore(
        {
          error: "Équipe introuvable",
        },
        { status: 404 }
      );
    }

    // Si un lieu est fourni, vérifier qu'il existe
    if (location && location.trim() !== "") {
      const locationRef = db.collection("locations").doc(location.trim());
      const locationDoc = await locationRef.get();
      if (!locationDoc.exists) {
        return jsonNoStore(
          {
            error: "Lieu introuvable",
          },
          { status: 400 }
        );
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

    // Audit logging
    logAuditAction(AUDIT_ACTIONS.TEAM_UPDATED, decoded.uid, {
      resource: "team",
      resourceId: teamId,
      details: { location: updateData.location },
      success: true,
    });

    return jsonNoStore({
      success: true,
      data: {
        teamId,
        location: updateData.location || null,
      },
    });
  } catch (error) {
    console.error("[app/api/teams/[teamId]/location] PATCH error", error);
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la mise à jour du lieu",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

