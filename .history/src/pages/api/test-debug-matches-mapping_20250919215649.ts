import { NextApiRequest, NextApiResponse } from "next";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Debug du mapping des matchs...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    
    const teamMatchesSyncService = new TeamMatchesSyncService();

    // Synchroniser les matchs pour toutes les équipes
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams();

    if (!syncResult.success || !syncResult.processedMatches) {
      throw new Error(syncResult.error || "Erreur lors de la synchronisation");
    }

    // Analyser le mapping des matchs
    const matchesByTeam = new Map<string, any[]>();
    
    syncResult.processedMatches.forEach(match => {
      const matchIdParts = match.id.split("_");
      if (matchIdParts.length >= 2) {
        const teamId = matchIdParts[1];
        if (!matchesByTeam.has(teamId)) {
          matchesByTeam.set(teamId, []);
        }
        matchesByTeam.get(teamId)!.push({
          id: match.id,
          teamId: teamId,
          opponent: match.opponent
        });
      }
    });

    // Afficher les 5 premières équipes avec leurs matchs
    const sampleMapping = Array.from(matchesByTeam.entries()).slice(0, 5).map(([teamId, matches]) => ({
      teamId,
      matchesCount: matches.length,
      sampleMatches: matches.slice(0, 2)
    }));

    console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);

    res.status(200).json({
      success: true,
      data: {
        totalMatches: syncResult.processedMatches.length,
        teamsWithMatches: matchesByTeam.size,
        sampleMapping
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du debug:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du debug",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
