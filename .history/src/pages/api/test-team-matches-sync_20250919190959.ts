import { NextApiRequest, NextApiResponse } from "next";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Test de synchronisation des matchs par équipe...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    
    const teamMatchesSyncService = new TeamMatchesSyncService();
    const db = getFirestoreAdmin();

    // Synchroniser les matchs pour toutes les équipes
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams();

    if (!syncResult.success || !syncResult.processedMatches) {
      throw new Error(syncResult.error || "Erreur lors de la synchronisation");
    }

    // Sauvegarder dans les sous-collections des équipes
    const saveResult = await teamMatchesSyncService.saveMatchesToTeamSubcollections(
      syncResult.processedMatches,
      db
    );

    // Mettre à jour les métadonnées de synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        teamMatches: new Date(),
      },
      { merge: true }
    );

    console.log("✅ Synchronisation terminée:", saveResult);

    res.status(200).json({
      success: true,
      message: "Synchronisation des matchs par équipe réussie",
      data: saveResult,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
