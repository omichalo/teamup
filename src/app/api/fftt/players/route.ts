import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import type { Player } from "@/types";

export async function GET(req: Request) {
  try {
    // 🛡️ Sentinel: Verify authentication and authorization
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      const role = resolveRole(decoded.role as string | undefined);
      if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

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

    return NextResponse.json(
      {
        players,
        total: players.length,
        clubCode,
      },
      { status: 200 }
    );
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


