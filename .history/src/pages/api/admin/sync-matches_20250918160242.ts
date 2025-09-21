import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { MatchSyncService } from "@/lib/shared/match-sync";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Déclenchement de la synchronisation des matchs directe");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Utiliser le service partagé
    const matchSyncService = new MatchSyncService();
    const syncResult = await matchSyncService.syncMatches();
    
    if (!syncResult.success || !syncResult.matches) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    // Sauvegarder dans Firestore
    const saveResult = await matchSyncService.saveMatchesToFirestore(
      syncResult.matches,
      db
    );

    res.status(200).json({
      success: true,
      message: `Synchronisation des matchs réussie: ${saveResult.saved} matchs sauvegardés`,
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
