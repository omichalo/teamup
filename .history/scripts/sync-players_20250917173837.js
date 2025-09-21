// Script de synchronisation récurrente des joueurs SQY Ping
// Usage: node scripts/sync-players.js

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { FFTTAPI } = require("@omichalo/ffttapi-node");

// Configuration Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "sqyping-teamup",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Configuration FFTT
const ffttApi = new FFTTAPI("SW251", "XpZ31v56Jr");

async function syncPlayers() {
  console.log("🔄 Début de la synchronisation des joueurs SQY Ping...");
  console.log(`⏰ ${new Date().toISOString()}`);

  try {
    // Initialiser Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: "sqyping-teamup"
    });
    
    const db = getFirestore(app);
    console.log("✅ Firebase Admin initialisé");

    // Initialiser l'API FFTT
    await ffttApi.initialize();
    console.log("✅ API FFTT initialisée");

    // Récupérer les joueurs du club SQY Ping
    const players = await ffttApi.getJoueursByClub("08781477");
    console.log(`📊 ${players.length} joueurs récupérés depuis l'API FFTT`);

    if (players.length === 0) {
      console.log("⚠️ Aucun joueur trouvé");
      return;
    }

    // Synchroniser chaque joueur avec Firestore
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (const ffttPlayer of players) {
      try {
        // Vérifier si le joueur existe déjà
        const existingPlayers = await db.collection("players")
          .where("ffttId", "==", ffttPlayer.licence)
          .get();

        const playerData = {
          ffttId: ffttPlayer.licence,
          firstName: ffttPlayer.prenom || "",
          lastName: ffttPlayer.nom || "",
          points: ffttPlayer.points || 0,
          ranking: ffttPlayer.classement || 0,
          isForeign: ffttPlayer.natio === "E",
          isTransferred: false,
          isFemale: ffttPlayer.sexe === "F",
          teamNumber: 0, // À assigner manuellement
          updatedAt: new Date(),
        };

        if (existingPlayers.empty) {
          // Créer un nouveau joueur
          await db.collection("players").add({
            ...playerData,
            createdAt: new Date(),
          });
          createdCount++;
          console.log(`✅ Joueur créé: ${playerData.firstName} ${playerData.lastName} (${playerData.ffttId})`);
        } else {
          // Mettre à jour le joueur existant
          const existingPlayer = existingPlayers.docs[0];
          await existingPlayer.ref.update(playerData);
          updatedCount++;
          console.log(`🔄 Joueur mis à jour: ${playerData.firstName} ${playerData.lastName} (${playerData.ffttId})`);
        }

        syncedCount++;
      } catch (error) {
        const errorMsg = `Erreur pour ${ffttPlayer.nom} ${ffttPlayer.prenom}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log("\n📊 Résumé de la synchronisation:");
    console.log(`   Total joueurs: ${players.length}`);
    console.log(`   Synchronisés: ${syncedCount}`);
    console.log(`   Créés: ${createdCount}`);
    console.log(`   Mis à jour: ${updatedCount}`);
    console.log(`   Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Erreurs rencontrées:");
      errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log(`\n✅ Synchronisation terminée à ${new Date().toISOString()}`);

  } catch (error) {
    console.error("❌ Erreur générale:", error.message);
    process.exit(1);
  }
}

// Exécuter la synchronisation
syncPlayers();
