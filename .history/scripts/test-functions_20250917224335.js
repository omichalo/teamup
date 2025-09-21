// Script pour tester les Firebase Functions déployées
// Usage: node scripts/test-functions.js

const https = require("https");

// Configuration Firebase (à remplacer par vos vraies URLs)
const PROJECT_ID = "sqyping-teamup";
const REGION = "europe-west1"; // ou votre région Firebase

const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

console.log("🧪 Test des Firebase Functions SQY Ping...");
console.log(`🔗 URL de base: ${BASE_URL}`);

// Fonction pour faire des requêtes HTTPS
function makeRequest(url, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test de connexion FFTT
async function testFFTTConnection() {
  console.log("\n🧪 Test de connexion FFTT...");

  try {
    const response = await makeRequest(`${BASE_URL}/testFFTTConnection`);

    if (response.status === 200) {
      console.log("✅ Connexion FFTT réussie !");
      console.log(`   Club: ${response.data.club.nom}`);
      console.log(`   Salle: ${response.data.club.nomSalle}`);
      console.log(`   Ville: ${response.data.club.villeSalle}`);
    } else {
      console.log(`❌ Erreur connexion FFTT: ${response.status}`);
      console.log(`   Détails: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`❌ Erreur test FFTT: ${error.message}`);
  }
}

// Test de synchronisation manuelle
async function testManualSync() {
  console.log("\n🔄 Test de synchronisation manuelle...");

  try {
    const response = await makeRequest(`${BASE_URL}/syncPlayersManual`, "POST");

    if (response.status === 200) {
      console.log("✅ Synchronisation réussie !");
      console.log(
        `   Joueurs synchronisés: ${response.data.synced}/${response.data.total}`
      );
      console.log(`   Créés: ${response.data.created}`);
      console.log(`   Mis à jour: ${response.data.updated}`);
      console.log(`   Erreurs: ${response.data.errors}`);
      console.log(`   Durée: ${response.data.duration}ms`);
    } else {
      console.log(`❌ Erreur synchronisation: ${response.status}`);
      console.log(`   Détails: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`❌ Erreur synchronisation: ${error.message}`);
  }
}

// Test de récupération des logs
async function testGetLogs() {
  console.log("\n📊 Test de récupération des logs...");

  try {
    const response = await makeRequest(`${BASE_URL}/getSyncLogs?limit=5`);

    if (response.status === 200) {
      console.log("✅ Récupération des logs réussie !");
      console.log(`   Nombre de logs: ${response.data.count}`);

      if (response.data.logs.length > 0) {
        console.log("   Derniers logs:");
        response.data.logs.forEach((log, index) => {
          console.log(
            `     ${index + 1}. ${log.type} - ${log.synced || 0} joueurs - ${
              log.timestamp?.toDate?.() || log.timestamp
            }`
          );
        });
      }
    } else {
      console.log(`❌ Erreur récupération logs: ${response.status}`);
      console.log(`   Détails: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`❌ Erreur récupération logs: ${error.message}`);
  }
}

// Fonction principale
async function runTests() {
  console.log(`⏰ Début des tests: ${new Date().toISOString()}`);

  try {
    // Test 1: Connexion FFTT
    await testFFTTConnection();

    // Attendre un peu entre les tests
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Synchronisation manuelle
    await testManualSync();

    // Attendre un peu entre les tests
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 3: Récupération des logs
    await testGetLogs();

    console.log(`\n✅ Tests terminés: ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`\n❌ Erreur générale: ${error.message}`);
  }
}

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes("--fftt")) {
  testFFTTConnection();
} else if (args.includes("--sync")) {
  testManualSync();
} else if (args.includes("--logs")) {
  testGetLogs();
} else {
  runTests();
}
