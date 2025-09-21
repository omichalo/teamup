import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { TeamSyncService } from "@/lib/shared/team-sync";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vérification d'authentification manuelle
  if (!req.user) {
    return res.status(401).json({
      error: "Token d'authentification requis",
      message: "Cette API nécessite une authentification valide",
    });
  }

  try {
    console.log("🔄 Déclenchement de la synchronisation des équipes directe");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Utiliser le service partagé
    const teamSyncService = new TeamSyncService();
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    // Sauvegarder dans Firestore
    const saveResult = await teamSyncService.saveTeamsAndMatchesToFirestore(
      syncResult.processedTeams,
      db
    );

    res.status(200).json({
      success: true,
      message: `Synchronisation des équipes réussie: ${saveResult.saved} équipes sauvegardées`,
      data: {
        teamsCount: saveResult.saved,
        errors: saveResult.errors,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des équipes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation des équipes",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
