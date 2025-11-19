import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
  adminAuth,
} from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
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
      return NextResponse.json(
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
      return NextResponse.json(
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
      return NextResponse.json(
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
        return NextResponse.json(
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

    return NextResponse.json({
      success: true,
      data: {
        teamId,
        location: updateData.location || null,
      },
    });
  } catch (error) {
    console.error("[app/api/teams/[teamId]/location] PATCH error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du lieu",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

