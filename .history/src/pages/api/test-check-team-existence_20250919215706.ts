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
    console.log("🔍 Vérification de l'existence des équipes...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // IDs des équipes qui ont des matchs
    const teamIds = ["1808", "16932", "33843", "9448", "9005"];
    
    const teamExistence = [];
    
    for (const teamId of teamIds) {
      const teamDoc = await db.collection("teams").doc(teamId).get();
      teamExistence.push({
        teamId,
        exists: teamDoc.exists,
        name: teamDoc.exists ? teamDoc.data()?.name : null
      });
    }

    // Vérifier aussi le nombre total d'équipes
    const allTeamsSnapshot = await db.collection("teams").get();
    const allTeamIds = allTeamsSnapshot.docs.map(doc => doc.id);

    console.log(`📊 ${allTeamIds.length} équipes au total`);

    res.status(200).json({
      success: true,
      data: {
        teamExistence,
        totalTeams: allTeamIds.length,
        allTeamIds: allTeamIds.slice(0, 10) // Afficher les 10 premiers
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
