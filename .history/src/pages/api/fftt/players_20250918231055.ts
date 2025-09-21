import { NextApiResponse } from "next";
import { Player } from "@/types";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getFirestoreAdmin } from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    const firestore = getFirestoreAdmin();
    
    // Récupérer les joueurs depuis Firestore
    const playersSnapshot = await firestore.collection("players").get();
    
    const players: Player[] = [];
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      players.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Player);
    });

    // Trier par points décroissants
    players.sort((a, b) => b.points - a.points);

    console.log(`📊 ${players.length} joueurs récupérés depuis Firestore`);

    res.status(200).json({
      players,
      total: players.length,
      clubCode: clubCode as string,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch players data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
