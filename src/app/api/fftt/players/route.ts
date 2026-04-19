import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import type { Player } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/fftt/players
 * Récupère la liste des joueurs du club.
 * Sécurisé par authentification de session et rôle (ADMIN/COACH).
 */
export async function GET(req: Request) {
  // Vérification d'authentification via cookie de session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Vérifier que l'email est vérifié pour plus de sécurité
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Autorisation : seuls les admins et coachs peuvent accéder aux données des joueurs (contient PII)
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("[app/api/fftt/players] Session verification failed:", error);
    return NextResponse.json(
      { error: "Session invalide" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const clubCode = searchParams.get("clubCode");

    if (!clubCode) {
      return NextResponse.json(
        { error: "Club code parameter is required" },
        { status: 400 }
      );
    }

    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    const playersSnapshot = await firestore.collection("players").get();

    const players: Player[] = [];
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtValue = data.createdAt;
      const updatedAtValue = data.updatedAt;
      const createdAt = createdAtValue instanceof Date 
        ? createdAtValue 
        : (createdAtValue && typeof createdAtValue === "object" && "toDate" in createdAtValue && typeof createdAtValue.toDate === "function")
          ? createdAtValue.toDate()
          : new Date();
      const updatedAt = updatedAtValue instanceof Date 
        ? updatedAtValue 
        : (updatedAtValue && typeof updatedAtValue === "object" && "toDate" in updatedAtValue && typeof updatedAtValue.toDate === "function")
          ? updatedAtValue.toDate()
          : new Date();
      players.push({
        id: doc.id,
        ...(data as Partial<Player>),
        createdAt,
        updatedAt,
      } as Player);
    });

    players.sort((a, b) => b.points - a.points);

    console.log(`📊 [app/api/fftt/players] ${players.length} joueurs récupérés depuis Firestore`);

    const res = NextResponse.json(
      {
        players,
        total: players.length,
        clubCode,
      },
      { status: 200 }
    );

    // Anti-caching pour les données sensibles (PII comme email/téléphone)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (error) {
    console.error("[app/api/fftt/players] Firestore Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch players data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
