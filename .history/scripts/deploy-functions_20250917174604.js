// Script pour déployer et tester les Firebase Functions
// Usage: node scripts/deploy-functions.js

const { exec } = require("child_process");
const path = require("path");

console.log("🚀 Déploiement des Firebase Functions SQY Ping...");

// Fonction pour exécuter des commandes
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${description}...`);
    console.log(`💻 Commande: ${command}`);
    
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️ Avertissement: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`✅ Sortie: ${stdout}`);
      }
      
      resolve(stdout);
    });
  });
}

// Fonction principale
async function deployFunctions() {
  try {
    // 1. Installer les dépendances des Functions
    await runCommand(
      "cd functions && npm install",
      "Installation des dépendances Functions"
    );

    // 2. Compiler les Functions
    await runCommand(
      "cd functions && npm run build",
      "Compilation des Functions TypeScript"
    );

    // 3. Déployer les Functions
    await runCommand(
      "firebase deploy --only functions",
      "Déploiement des Functions sur Firebase"
    );

    console.log("\n🎉 Déploiement terminé avec succès !");
    console.log("\n📋 Functions déployées:");
    console.log("   - syncPlayersDaily (quotidienne 6h00)");
    console.log("   - syncPlayersWeekly (hebdomadaire dimanche 8h00)");
    console.log("   - syncPlayersManual (déclenchement manuel)");
    console.log("   - getSyncLogs (récupération des logs)");
    console.log("   - testFFTTConnection (test de connexion)");

    console.log("\n🧪 Pour tester les Functions:");
    console.log("   - Test connexion FFTT: firebase functions:shell");
    console.log("   - Synchronisation manuelle: curl -X POST [URL_FUNCTION]");
    console.log("   - Voir les logs: firebase functions:log");

  } catch (error) {
    console.error("\n❌ Erreur lors du déploiement:", error.message);
    process.exit(1);
  }
}

// Fonction pour tester les Functions localement
async function testFunctionsLocally() {
  try {
    console.log("\n🧪 Test local des Functions...");

    // Démarrer l'émulateur Firebase
    await runCommand(
      "firebase emulators:start --only functions",
      "Démarrage de l'émulateur Functions"
    );

  } catch (error) {
    console.error("\n❌ Erreur lors du test local:", error.message);
    process.exit(1);
  }
}

// Fonction pour obtenir les URLs des Functions déployées
async function getFunctionUrls() {
  try {
    console.log("\n🔗 Récupération des URLs des Functions...");
    
    const output = await runCommand(
      "firebase functions:list",
      "Liste des Functions déployées"
    );
    
    console.log("\n📋 URLs des Functions:");
    console.log("   - Synchronisation manuelle: [PROJECT_ID]-[REGION]-syncPlayersManual");
    console.log("   - Logs de synchronisation: [PROJECT_ID]-[REGION]-getSyncLogs");
    console.log("   - Test connexion FFTT: [PROJECT_ID]-[REGION]-testFFTTConnection");

  } catch (error) {
    console.error("\n❌ Erreur lors de la récupération des URLs:", error.message);
  }
}

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes("--test")) {
  testFunctionsLocally();
} else if (args.includes("--urls")) {
  getFunctionUrls();
} else {
  deployFunctions();
}
