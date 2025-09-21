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
    console.log("🔄 Vérification des équipes...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Récupérer toutes les équipes
    const teamsSnapshot = await db.collection("teams").get();
    console.log(`📋 ${teamsSnapshot.size} équipes trouvées`);

    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    res.status(200).json({
      success: true,
      data: {
        totalTeams: teamsSnapshot.size,
        teams: teams.slice(0, 10) // Afficher les 10 premières équipes
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
