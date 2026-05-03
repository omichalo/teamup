import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import type { Player } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clubCode = searchParams.get("clubCode");

    if (!clubCode) {
      return NextResponse.json(
        { success: false, error: "Club code parameter is required" },
        { status: 400 }
      );
    }

    // Initialiser Firebase Admin avant d'utiliser adminAuth
    await initializeFirebaseAdmin();

    // Vérification d'authentification et d'autorisation
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Authentification requise" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (authError) {
      console.error("[app/api/fftt/players] Session verification failed", authError);
      return NextResponse.json(
        { success: false, error: "Session invalide ou expirée" },
        { status: 401 }
      );
    }

    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Seuls les admins et coaches peuvent accéder aux données des joueurs (PII)
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

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
        success: true,
        players,
        total: players.length,
        clubCode,
      },
      { status: 200 }
    );

    // Sécurité: Ne pas mettre en cache les données PII
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[app/api/fftt/players] Error:", error);
    // Sécurité: Ne pas exposer les détails de l'erreur au client
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch players data",
      },
      { status: 500 }
    );
  }
}


