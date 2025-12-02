import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import type { Player } from "@/types";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clubCode = searchParams.get("clubCode");

    if (!clubCode) {
      return createErrorResponse("Club code parameter is required", 400);
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

    return createSecureResponse(
      {
        players,
        total: players.length,
        clubCode,
      },
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/fftt/players",
      defaultMessage: "Failed to fetch players data",
    });
  }
}


