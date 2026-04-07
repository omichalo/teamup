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
        { error: "Club code parameter is required" },
        { status: 400 }
      );
    }

    // Toujours s'assurer que Firebase Admin est initialisé avant d'utiliser adminAuth
    await initializeFirebaseAdmin();

    // Sécurité : Vérification de la session
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
      if (!decoded.email_verified) {
        return NextResponse.json(
          { error: "Email non vérifié" },
          { status: 403 }
        );
      }

      // Vérifier que l'utilisateur est admin ou coach
      const role = resolveRole(decoded.role as string | undefined);
      if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("[app/api/fftt/players] Session verification error:", error);
      return NextResponse.json(
        { error: "Session invalide ou expirée" },
        { status: 401 }
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
        players,
        total: players.length,
        clubCode,
      },
      { status: 200 }
    );

    // Sécurité : Empêcher la mise en cache des données sensibles (PII)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (error) {
    console.error("[app/api/fftt/players] Firestore Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch players data",
      },
      { status: 500 }
    );
  }
}
