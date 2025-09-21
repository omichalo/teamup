import { NextApiResponse } from "next";
import { PlayerSyncService } from "@/lib/shared/player-sync";

export default async function handler(req: any, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Test de l'enrichissement des joueurs...");
    
    const playerSyncService = new PlayerSyncService();
    const result = await playerSyncService.syncPlayers();
    
    console.log("✅ Résultat:", result);
    
    if (result.success && result.processedPlayers) {
      console.log(`📊 ${result.processedPlayers.length} joueurs enrichis`);
      
      // Afficher le premier joueur enrichi comme exemple
      const firstPlayer = result.processedPlayers[0];
      console.log("🔍 Premier joueur enrichi:", {
        licence: firstPlayer.licence,
        nom: firstPlayer.nom,
        prenom: firstPlayer.prenom,
        points: firstPlayer.points,
        classement: firstPlayer.classement,
        categorie: firstPlayer.categorie,
        nationalite: firstPlayer.nationalite,
        dateNaissance: firstPlayer.dateNaissance,
        lieuNaissance: firstPlayer.lieuNaissance,
        datePremiereLicence: firstPlayer.datePremiereLicence,
        clubPrecedent: firstPlayer.clubPrecedent,
      });

      res.status(200).json({
        success: true,
        message: `Test réussi: ${result.processedPlayers.length} joueurs enrichis`,
        samplePlayer: {
          licence: firstPlayer.licence,
          nom: firstPlayer.nom,
          prenom: firstPlayer.prenom,
          points: firstPlayer.points,
          classement: firstPlayer.classement,
          categorie: firstPlayer.categorie,
          nationalite: firstPlayer.nationalite,
          dateNaissance: firstPlayer.dateNaissance,
          lieuNaissance: firstPlayer.lieuNaissance,
          datePremiereLicence: firstPlayer.datePremiereLicence,
          clubPrecedent: firstPlayer.clubPrecedent,
        },
        totalPlayers: result.processedPlayers.length,
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
      error: "Erreur lors du test d'enrichissement",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
