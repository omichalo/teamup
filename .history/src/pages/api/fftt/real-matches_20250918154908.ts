import { NextApiResponse } from "next";
import { Match } from "@/types";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { MatchSyncService } from "@/lib/shared/match-sync";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    const matchSyncService = new MatchSyncService();
    const syncResult = await matchSyncService.syncMatches();
    
    if (!syncResult.success || !syncResult.matches) {
      return res.status(500).json({
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    res.status(200).json({
      success: true,
      matches: syncResult.matches,
      count: syncResult.matchesCount,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des matchs:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des matchs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);