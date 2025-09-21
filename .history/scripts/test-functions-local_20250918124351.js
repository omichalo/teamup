#!/usr/bin/env node

/**
 * Script pour tester les Functions localement
 * Usage: node scripts/test-functions-local.js
 */

const { execSync } = require("child_process");

console.log("🧪 Test des Functions Firebase localement...");

try {
  // Démarrer l'émulateur Firebase Functions
  console.log("🚀 Démarrage de l'émulateur Firebase Functions...");
  console.log("📋 L'émulateur sera accessible sur http://localhost:5001");
  console.log("🔄 Pour tester la synchronisation manuelle :");
  console.log(
    "   curl -X POST http://localhost:5001/sqyping-teamup/us-central1/triggerMatchSync"
  );
  console.log("");
  console.log("⏹️  Appuyez sur Ctrl+C pour arrêter l'émulateur");
  console.log("");

  execSync("cd functions && npm run serve", { stdio: "inherit" });
} catch (error) {
  if (error.signal === "SIGINT") {
    console.log("\n✅ Émulateur arrêté");
  } else {
    console.error("❌ Erreur lors du test des Functions :", error.message);
    process.exit(1);
  }
}
