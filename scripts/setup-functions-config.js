#!/usr/bin/env node

/**
 * Script pour configurer les variables d'environnement Firebase Functions
 * Usage: node scripts/setup-functions-config.js
 */

const { execSync } = require("child_process");

console.log(
  "🔧 Configuration des variables d'environnement Firebase Functions..."
);

try {
  // Configuration FFTT
  console.log("📋 Configuration des identifiants FFTT...");
  execSync(
    'firebase functions:config:set fftt.id="SW251" fftt.pwd="XpZ31v56Jr" fftt.club_code="08781477"',
    { stdio: "inherit" }
  );

  console.log("✅ Configuration terminée !");
  console.log("");
  console.log("📋 Variables configurées :");
  console.log("  - fftt.id: SW251");
  console.log("  - fftt.pwd: XpZ31v56Jr");
  console.log("  - fftt.club_code: 08781477");
  console.log("");
  console.log("🚀 Vous pouvez maintenant déployer les Functions avec :");
  console.log("   npm run deploy:functions");
} catch (error) {
  console.error("❌ Erreur lors de la configuration :", error.message);
  process.exit(1);
}

