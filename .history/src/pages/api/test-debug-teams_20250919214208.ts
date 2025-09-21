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
    console.log("🔍 Debug des équipes...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Récupérer toutes les équipes
    const teamsSnapshot = await db.collection("teams").get();
    
    // Analyser les équipes par numéro et genre
    const teamsByNumber = new Map<string, any[]>();
    
    teamsSnapshot.docs.forEach(doc => {
      const teamData = doc.data();
      const key = `${teamData.teamNumber}_${teamData.isFemale ? "F" : "M"}`;
      
      if (!teamsByNumber.has(key)) {
        teamsByNumber.set(key, []);
      }
      teamsByNumber.get(key)!.push({
        id: doc.id,
        name: teamData.name,
        division: teamData.division,
        epreuve: teamData.epreuve
      });
    });

    // Trouver les équipes en double
    const duplicates = [];
    for (const [key, teams] of teamsByNumber) {
      if (teams.length > 1) {
        duplicates.push({ key, teams });
      }
    }

    console.log(`📊 Total équipes: ${teamsSnapshot.size}`);
    console.log(`🔄 Équipes uniques: ${teamsByNumber.size}`);
    console.log(`⚠️ Équipes en double: ${duplicates.length}`);

    res.status(200).json({
      success: true,
      data: {
        totalTeams: teamsSnapshot.size,
        uniqueTeams: teamsByNumber.size,
        duplicates: duplicates.length,
        duplicateDetails: duplicates.slice(0, 5)
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du debug:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du debug",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
