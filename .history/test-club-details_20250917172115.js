// Test direct des détails du club SQY Ping
const { FFTTAPI } = require('@omichalo/ffttapi-node');

async function testClubDetails() {
  try {
    const api = new FFTTAPI('SW251', 'XpZ31v56Jr');
    console.log('✅ API créée avec succès');
    
    // Initialiser l'API
    await api.initialize();
    console.log('✅ API initialisée');
    
    // Tester les détails du club
    console.log('\n🏢 Test détails du club SQY Ping...');
    try {
      const clubDetails = await api.getClubDetails('08781477');
      console.log('✅ Détails du club récupérés:');
      console.log('   Nom:', clubDetails.nom);
      console.log('   Ville:', clubDetails.ville);
      console.log('   Adresse:', clubDetails.adresse);
      console.log('   Téléphone:', clubDetails.telephone);
      console.log('   Email:', clubDetails.email);
    } catch (error) {
      console.log('❌ Erreur détails club:', error.message);
    }
    
    // Tester les équipes du club
    console.log('\n👥 Test équipes du club...');
    try {
      const equipes = await api.getEquipesByClub('08781477');
      console.log('✅ Équipes récupérées:', equipes.length);
      equipes.forEach((equipe, index) => {
        console.log(`   ${index + 1}. ${equipe.libequipe} (${equipe.liendivision})`);
      });
    } catch (error) {
      console.log('❌ Erreur équipes:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
    console.log('Stack:', error.stack);
  }
}

testClubDetails();
