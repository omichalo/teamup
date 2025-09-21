import { NextApiRequest, NextApiResponse } from "next";
import { TeamSyncService } from "@/lib/shared/team-sync";
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
    console.log("🔄 Test de synchronisation des équipes (nouveaux IDs FFTT)...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    
    const teamSyncService = new TeamSyncService();

    // Synchroniser les équipes
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      throw new Error(syncResult.error || "Erreur lors de la synchronisation");
    }

    // Sauvegarder dans Firestore
    const saveResult = await teamSyncService.saveTeamsAndMatchesToFirestore(
      syncResult.processedTeams,
      db
    );

    // Mettre à jour les métadonnées de synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        teams: Timestamp.fromDate(new Date()),
      },
      { merge: true }
    );

    console.log("✅ Synchronisation terminée:", saveResult);

    // Afficher quelques exemples d'IDs
    const sampleTeams = syncResult.processedTeams.slice(0, 3).map(team => ({
      id: team.id,
      name: team.name,
      ffttId: team.ffttId
    }));

    res.status(200).json({
      success: true,
      message: "Synchronisation des équipes réussie (nouveaux IDs FFTT)",
      data: {
        ...saveResult,
        sampleTeams
      },
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
