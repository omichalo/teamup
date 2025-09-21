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
    console.log("🔄 Vérification des sous-collections...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Récupérer toutes les équipes
    const teamsSnapshot = await db.collection("teams").get();
    console.log(`📋 ${teamsSnapshot.size} équipes trouvées`);

    const results = [];

    // Vérifier chaque équipe
    for (const teamDoc of teamsSnapshot.docs) {
      const teamId = teamDoc.id;
      const teamData = teamDoc.data();
      
      // Compter les matchs dans la sous-collection
      const matchesSnapshot = await teamDoc.ref.collection("matches").get();
      
      results.push({
        teamId,
        teamName: teamData.name || teamData.libelle,
        matchesCount: matchesSnapshot.size,
        hasMatches: matchesSnapshot.size > 0
      });
    }

    // Compter le total
    const totalMatches = results.reduce((sum, team) => sum + team.matchesCount, 0);
    const teamsWithMatches = results.filter(team => team.hasMatches).length;

    console.log(`✅ Total: ${totalMatches} matchs dans ${teamsWithMatches} équipes`);

    res.status(200).json({
      success: true,
      data: {
        totalTeams: teamsSnapshot.size,
        totalMatches,
        teamsWithMatches,
        teams: results.filter(team => team.hasMatches).slice(0, 5) // Afficher les 5 premières équipes avec des matchs
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
