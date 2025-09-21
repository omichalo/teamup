// Test simple de l'API FFTT sans Firebase
const { FFTTAPI } = require("@omichalo/ffttapi-node");

async function testFFTT() {
  console.log("🧪 Test simple de l'API FFTT...");
  
  try {
    const ffttApi = new FFTTAPI("SW251", "XpZ31v56Jr");
    
    console.log("📡 Initialisation de l'API FFTT...");
    await ffttApi.initialize();
    
    console.log("📊 Récupération des détails du club SQY Ping...");
    const clubDetails = await ffttApi.getClubDetails("08781477");
    console.log("✅ Club récupéré:", clubDetails.nom);
    console.log("   Salle:", clubDetails.nomSalle);
    console.log("   Ville:", clubDetails.villeSalle);
    
    console.log("📊 Récupération des équipes...");
    const equipes = await ffttApi.getEquipesByClub("08781477");
    console.log(`✅ ${equipes.length} équipes récupérées`);
    
    console.log("📊 Récupération des joueurs...");
    const players = await ffttApi.getJoueursByClub("08781477");
    console.log(`✅ ${players.length} joueurs récupérés`);
    
    if (players.length > 0) {
      console.log("   Premier joueur:", players[0].nom, players[0].prenom);
    }
    
    console.log("\n🎉 Test FFTT réussi !");
    
  } catch (error) {
    console.error("❌ Erreur test FFTT:", error.message);
  }
}

testFFTT();
