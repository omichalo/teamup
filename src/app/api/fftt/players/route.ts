import { NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { verifyApiAuth } from "@/lib/auth/api-auth";
import type { Player } from "@/types";

export async function GET(req: Request) {
  try {
    // Vérification d'authentification et d'autorisation
    // L'accès à la liste complète des joueurs est restreint aux administrateurs et coachs
    const { errorResponse } = await verifyApiAuth([USER_ROLES.ADMIN, USER_ROLES.COACH]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const clubCode = searchParams.get("clubCode");

    if (!clubCode) {
      return NextResponse.json(
        { error: "Club code parameter is required" },
        { status: 400 }
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

    return NextResponse.json(
      {
        players,
        total: players.length,
        clubCode,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[app/api/fftt/players] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch players data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
