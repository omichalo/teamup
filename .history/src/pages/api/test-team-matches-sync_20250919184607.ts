import { NextApiResponse } from "next";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";

export default async function handler(req: any, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Test de la synchronisation des matchs par équipe...");
    
    const startTime = Date.now();
    const teamMatchesSyncService = new TeamMatchesSyncService();
    const result = await teamMatchesSyncService.syncMatchesForAllTeams();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("✅ Résultat:", result);
    console.log(`⏱️ Durée totale: ${duration}ms (${Math.round(duration/1000)}s)`);
    
    if (result.success && result.processedMatches) {
      console.log(`📊 ${result.processedMatches.length} matchs synchronisés`);
      
      // Grouper par équipe pour voir la répartition
      const matchesByTeam = new Map<string, number>();
      result.processedMatches.forEach(match => {
        const teamKey = `${match.teamNumber}_${match.isFemale ? 'F' : 'M'}`;
        matchesByTeam.set(teamKey, (matchesByTeam.get(teamKey) || 0) + 1);
      });

      console.log("📈 Répartition par équipe:", Object.fromEntries(matchesByTeam));

      // Afficher quelques matchs comme exemples
      const sampleMatches = result.processedMatches.slice(0, 3);
      console.log("🔍 Exemples de matchs:", sampleMatches.map(m => ({
        id: m.id,
        teamNumber: m.teamNumber,
        opponent: m.opponent,
        date: m.date,
        score: m.score,
        result: m.result,
      })));

      res.status(200).json({
        success: true,
        message: `Test réussi: ${result.processedMatches.length} matchs synchronisés en ${Math.round(duration/1000)}s`,
        stats: {
          totalMatches: result.processedMatches.length,
          durationMs: duration,
          durationSeconds: Math.round(duration/1000),
          teamsCount: matchesByTeam.size,
          matchesByTeam: Object.fromEntries(matchesByTeam),
        },
        sampleMatches: sampleMatches.map(m => ({
          id: m.id,
          teamNumber: m.teamNumber,
          opponent: m.opponent,
          date: m.date,
          score: m.score,
          result: m.result,
        })),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Échec de la synchronisation des matchs par équipe",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du test de synchronisation des matchs par équipe",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
