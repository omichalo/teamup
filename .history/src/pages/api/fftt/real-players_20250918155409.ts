import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { PlayerSyncService } from "@/lib/shared/player-sync";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    const playerSyncService = new PlayerSyncService();
    const syncResult = await playerSyncService.syncPlayers();

    if (!syncResult.success || !syncResult.processedPlayers) {
      return res.status(500).json({
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    res.status(200).json({
      success: true,
      players: syncResult.processedPlayers,
      count: syncResult.playersCount,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des joueurs:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des joueurs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
