import { NextResponse } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
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

    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    const playersSnapshot = await firestore.collection("players").get();

    const players: Player[] = [];
    playersSnapshot.forEach((doc) => {
      const data = doc.data() as any;
      players.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
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


