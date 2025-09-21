import { NextApiRequest, NextApiResponse } from "next";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Vérification des équipes spécifiques...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Équipes qui ont des matchs selon le debug précédent
    const teamIds = ["1808", "16932", "33843", "9448", "9005"];
    
    const teamMatchesCounts = [];
    
    for (const teamId of teamIds) {
      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (teamDoc.exists) {
        const matchesSnapshot = await teamDoc.ref.collection("matches").get();
        teamMatchesCounts.push({
          teamId,
          teamName: teamDoc.data()?.name,
          matchesCount: matchesSnapshot.size
        });
      } else {
        teamMatchesCounts.push({
          teamId,
          teamName: "ÉQUIPE NON TROUVÉE",
          matchesCount: 0
        });
      }
    }

    console.log(`📊 ${teamMatchesCounts.length} équipes vérifiées`);

    res.status(200).json({
      success: true,
      data: {
        teamMatchesCounts
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la vérification",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
