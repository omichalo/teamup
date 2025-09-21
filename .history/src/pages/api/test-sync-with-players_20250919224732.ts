import { NextApiRequest, NextApiResponse } from "next";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Test de synchronisation avec détails des joueurs...");

    const teamMatchesSyncService = new TeamMatchesSyncService();

    // Synchroniser les matchs pour toutes les équipes
    const result = await teamMatchesSyncService.syncMatchesForAllTeams();

    console.log("✅ Synchronisation terminée:", result);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
