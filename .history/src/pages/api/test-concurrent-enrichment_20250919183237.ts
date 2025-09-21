import { NextApiResponse } from "next";
import { PlayerSyncService } from "@/lib/shared/player-sync";

export default async function handler(req: any, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Test de l'enrichissement concurrent des joueurs...");
    
    const startTime = Date.now();
    const playerSyncService = new PlayerSyncService();
    const result = await playerSyncService.syncPlayers();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("✅ Résultat:", result);
    console.log(`⏱️ Durée totale: ${duration}ms (${Math.round(duration/1000)}s)`);
    
    if (result.success && result.processedPlayers) {
      console.log(`📊 ${result.processedPlayers.length} joueurs enrichis`);
      
      // Afficher quelques joueurs enrichis comme exemples
      const samplePlayers = result.processedPlayers.slice(0, 3);
      console.log("🔍 Exemples de joueurs enrichis:", samplePlayers.map(p => ({
        licence: p.licence,
        nom: p.nom,
        prenom: p.prenom,
        points: p.points,
        classement: p.classement,
        categorie: p.categorie,
        nationalite: p.nationalite,
      })));

      res.status(200).json({
        success: true,
        message: `Test réussi: ${result.processedPlayers.length} joueurs enrichis en ${Math.round(duration/1000)}s`,
        stats: {
          totalPlayers: result.processedPlayers.length,
          durationMs: duration,
          durationSeconds: Math.round(duration/1000),
          averageTimePerPlayer: Math.round(duration / result.processedPlayers.length),
        },
        samplePlayers: samplePlayers.map(p => ({
          licence: p.licence,
          nom: p.nom,
          prenom: p.prenom,
          points: p.points,
          classement: p.classement,
          categorie: p.categorie,
          nationalite: p.nationalite,
        })),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Échec de l'enrichissement",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du test d'enrichissement concurrent",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
