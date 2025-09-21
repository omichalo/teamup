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
    console.log("🔍 Vérification de la nouvelle structure...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Récupérer quelques équipes pour voir la nouvelle structure
    const teamsSnapshot = await db.collection("teams").limit(5).get();
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    // Vérifier les sous-collections de matchs pour quelques équipes
    const teamMatchesCounts = [];
    for (const teamDoc of teamsSnapshot.docs) {
      const matchesSnapshot = await teamDoc.ref.collection("matches").get();
      teamMatchesCounts.push({
        teamId: teamDoc.id,
        teamName: teamDoc.data().name,
        matchesCount: matchesSnapshot.size
      });
    }

    console.log(`📊 ${teams.length} équipes vérifiées`);

    res.status(200).json({
      success: true,
      data: {
        teams: teams,
        teamMatchesCounts: teamMatchesCounts
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
