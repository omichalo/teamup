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
    console.log("🔍 Debug des matchs par équipe...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    
    const teamMatchesSyncService = new TeamMatchesSyncService();

    // Synchroniser les matchs pour toutes les équipes
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams();

    if (!syncResult.success || !syncResult.processedMatches) {
      throw new Error(syncResult.error || "Erreur lors de la synchronisation");
    }

    // Analyser les matchs par équipe
    const matchesByTeam = new Map<string, number>();
    const allMatchIds = new Set<string>();
    const duplicateMatches = new Set<string>();

    syncResult.processedMatches.forEach(match => {
      const key = `${match.teamNumber}_${match.isFemale ? "F" : "M"}`;
      matchesByTeam.set(key, (matchesByTeam.get(key) || 0) + 1);
      
      if (allMatchIds.has(match.id)) {
        duplicateMatches.add(match.id);
      }
      allMatchIds.add(match.id);
    });

    console.log(`📊 Total matchs: ${syncResult.processedMatches.length}`);
    console.log(`🔄 Matchs uniques: ${allMatchIds.size}`);
    console.log(`⚠️ Matchs dupliqués: ${duplicateMatches.size}`);

    res.status(200).json({
      success: true,
      data: {
        totalMatches: syncResult.processedMatches.length,
        uniqueMatches: allMatchIds.size,
        duplicateMatches: duplicateMatches.size,
        matchesByTeam: Object.fromEntries(matchesByTeam),
        sampleDuplicates: Array.from(duplicateMatches).slice(0, 5)
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
