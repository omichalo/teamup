import { NextApiRequest, NextApiResponse } from "next";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Récupération du statut de synchronisation...");

    // Récupérer les métadonnées de synchronisation
    const metadataDoc = await getDoc(doc(db, "metadata", "lastSync"));
    const metadata = metadataDoc.exists() ? metadataDoc.data() : {};

    // Récupérer le nombre de joueurs
    const playersSnapshot = await getDocs(collection(db, "players"));
    const playersCount = playersSnapshot.size;

    // Récupérer le nombre de matchs
    const matchesSnapshot = await getDocs(collection(db, "matches"));
    const matchesCount = matchesSnapshot.size;

    console.log(`✅ Statut récupéré: ${playersCount} joueurs, ${matchesCount} matchs`);

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
