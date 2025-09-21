const { PlayerSyncService } = require('./src/lib/shared/player-sync');

async function testEnrichment() {
  console.log('🧪 Test de l\'enrichissement des joueurs...');
  
  try {
    const playerSyncService = new PlayerSyncService();
    const result = await playerSyncService.syncPlayers();
    
    console.log('✅ Résultat:', result);
    
    if (result.success && result.processedPlayers) {
      console.log(`📊 ${result.processedPlayers.length} joueurs enrichis`);
      
      // Afficher le premier joueur enrichi comme exemple
      const firstPlayer = result.processedPlayers[0];
      console.log('🔍 Premier joueur enrichi:', {
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
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testEnrichment();
