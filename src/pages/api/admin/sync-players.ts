import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { PlayerSyncService } from "@/lib/shared/player-sync";
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
    console.log("🔄 Déclenchement de la synchronisation des joueurs directe");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Utiliser le service partagé
    const playerSyncService = new PlayerSyncService();
    const syncResult = await playerSyncService.syncPlayers();

    if (!syncResult.success || !syncResult.processedPlayers) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    // Sauvegarder dans Firestore
    const saveResult = await playerSyncService.savePlayersToFirestore(
      syncResult.processedPlayers,
      db
    );

    res.status(200).json({
      success: true,
      message: `Synchronisation des joueurs réussie: ${saveResult.saved} joueurs sauvegardés`,
      data: {
        playersCount: saveResult.saved,
        errors: saveResult.errors,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation des joueurs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
