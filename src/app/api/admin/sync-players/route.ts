import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { syncPlayers } from "@/lib/shared/sync-utils";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export async function POST() {
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

    console.log("🔄 [app/api/admin/sync-players] Déclenchement de la synchronisation des joueurs directe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const result = await syncPlayers(db);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("❌ [app/api/admin/sync-players] Erreur lors de la synchronisation des joueurs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la synchronisation des joueurs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


