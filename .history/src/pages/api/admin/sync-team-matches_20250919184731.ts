import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";
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
    console.log("🔄 Déclenchement de la synchronisation des matchs par équipe");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Utiliser le service partagé
    const teamMatchesSyncService = new TeamMatchesSyncService();
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams();

    if (!syncResult.success || !syncResult.processedMatches) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    // Sauvegarder dans les sous-collections des équipes
    const saveResult =
      await teamMatchesSyncService.saveMatchesToTeamSubcollections(
        syncResult.processedMatches,
        db
      );

    res.status(200).json({
      success: true,
      message: `Synchronisation des matchs réussie: ${saveResult.saved} matchs sauvegardés dans les sous-collections`,
      data: {
        matchesCount: saveResult.saved,
        errors: saveResult.errors,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des matchs:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation des matchs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
