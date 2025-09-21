import { NextApiResponse } from "next";
import { TeamSyncService } from "@/lib/shared/team-sync";

export default async function handler(req: any, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Test de la synchronisation des équipes...");
    
    const startTime = Date.now();
    const teamSyncService = new TeamSyncService();
    const result = await teamSyncService.syncTeamsAndMatches();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("✅ Résultat:", result);
    console.log(`⏱️ Durée totale: ${duration}ms (${Math.round(duration/1000)}s)`);
    
    if (result.success && result.processedTeams) {
      console.log(`📊 ${result.processedTeams.length} équipes synchronisées`);
      
      // Afficher quelques équipes comme exemples
      const sampleTeams = result.processedTeams.slice(0, 3);
      console.log("🔍 Exemples d'équipes:", sampleTeams.map(t => ({
        id: t.id,
        name: t.name,
        division: t.division,
        isFemale: t.isFemale,
        teamNumber: t.teamNumber,
      })));

      res.status(200).json({
        success: true,
        message: `Test réussi: ${result.processedTeams.length} équipes synchronisées en ${Math.round(duration/1000)}s`,
        stats: {
          totalTeams: result.processedTeams.length,
          durationMs: duration,
          durationSeconds: Math.round(duration/1000),
        },
        sampleTeams: sampleTeams.map(t => ({
          id: t.id,
          name: t.name,
          division: t.division,
          isFemale: t.isFemale,
          teamNumber: t.teamNumber,
        })),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Échec de la synchronisation des équipes",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du test de synchronisation des équipes",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
