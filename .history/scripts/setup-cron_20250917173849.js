// Script pour configurer la synchronisation récurrente des joueurs
// Usage: node scripts/setup-cron.js

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

console.log("🔄 Configuration de la synchronisation récurrente des joueurs SQY Ping...");

// Synchronisation quotidienne à 6h00
const dailySync = cron.schedule('0 6 * * *', () => {
  console.log(`\n⏰ Synchronisation quotidienne démarrée: ${new Date().toISOString()}`);
  
  exec('node scripts/sync-players.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erreur synchronisation: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Avertissement: ${stderr}`);
    }
    console.log(`✅ Synchronisation terminée: ${new Date().toISOString()}`);
  });
}, {
  scheduled: false,
  timezone: "Europe/Paris"
});

// Synchronisation hebdomadaire le dimanche à 8h00
const weeklySync = cron.schedule('0 8 * * 0', () => {
  console.log(`\n⏰ Synchronisation hebdomadaire démarrée: ${new Date().toISOString()}`);
  
  exec('node scripts/sync-players.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erreur synchronisation: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Avertissement: ${stderr}`);
    }
    console.log(`✅ Synchronisation terminée: ${new Date().toISOString()}`);
  });
}, {
  scheduled: false,
  timezone: "Europe/Paris"
});

// Fonction pour démarrer les tâches
function startScheduledSync() {
  console.log("🚀 Démarrage des tâches de synchronisation...");
  
  dailySync.start();
  weeklySync.start();
  
  console.log("✅ Tâches configurées:");
  console.log("   - Synchronisation quotidienne: 6h00 (Europe/Paris)");
  console.log("   - Synchronisation hebdomadaire: Dimanche 8h00 (Europe/Paris)");
  console.log("\n📋 Pour arrêter les tâches, appuyez sur Ctrl+C");
}

// Fonction pour tester la synchronisation immédiatement
function testSync() {
  console.log("🧪 Test de synchronisation immédiate...");
  
  exec('node scripts/sync-players.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erreur test: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Avertissement: ${stderr}`);
    }
    console.log("✅ Test terminé");
    
    // Démarrer les tâches après le test
    startScheduledSync();
  });
}

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('--test')) {
  testSync();
} else {
  startScheduledSync();
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt des tâches de synchronisation...');
  dailySync.stop();
  weeklySync.stop();
  console.log('✅ Tâches arrêtées');
  process.exit(0);
});
