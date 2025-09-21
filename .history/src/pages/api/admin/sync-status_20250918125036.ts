import { NextApiRequest, NextApiResponse } from "next";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialiser Firebase Admin
    const admin = await initializeFirebaseAdmin();
    const db = admin.firestore();

    // Récupérer les métadonnées de synchronisation
    const metadataDoc = await db.collection("metadata").doc("lastSync").get();
    const metadata = metadataDoc.exists ? metadataDoc.data() : {};

    // Récupérer le nombre de joueurs
    const playersSnapshot = await db.collection("players").get();
    const playersCount = playersSnapshot.size;

    // Récupérer le nombre de matchs
    const matchesSnapshot = await db.collection("matches").get();
    const matchesCount = matchesSnapshot.size;

    res.status(200).json({
      success: true,
      data: {
        players: {
          lastSync: metadata.players?.toDate?.()?.toISOString() || null,
          count: metadata.playersCount || playersCount,
        },
        matches: {
          lastSync: metadata.matches?.toDate?.()?.toISOString() || null,
          count: metadata.matchesCount || matchesCount,
        },
      },
    });

  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du statut",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
