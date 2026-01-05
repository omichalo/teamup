#!/usr/bin/env node

/**
 * Script pour configurer les variables d'environnement Firebase Functions
 * Usage: node scripts/setup-functions-config.js
 * 
 * IMPORTANT: Les credentials FFTT doivent être fournis via des variables d'environnement
 * ou un fichier .env.local (non commité).
 * 
 * Variables d'environnement requises:
 * - ID_FFTT: Identifiant FFTT (secret)
 * - PWD_FFTT: Mot de passe FFTT (secret)
 * - CLUB_CODE: Code du club (optionnel, défaut: 08781477, non secret)
 */

const { execSync } = require("child_process");
require("dotenv").config({ path: ".env.local" });

console.log(
  "🔧 Configuration des variables d'environnement Firebase Functions..."
);

try {
  // Récupérer les credentials depuis les variables d'environnement
  const ffttId = process.env.ID_FFTT;
  const ffttPwd = process.env.PWD_FFTT;
  const ffttClubCode = process.env.CLUB_CODE || "08781477";

  if (!ffttId || !ffttPwd) {
    console.error("❌ Erreur: Les variables d'environnement ID_FFTT et PWD_FFTT sont requises.");
    console.error("");
    console.error("💡 Pour configurer:");
    console.error("   1. Créez un fichier .env.local (non commité) avec:");
    console.error("      ID_FFTT=votre_id");
    console.error("      PWD_FFTT=votre_mot_de_passe");
    console.error("      # CLUB_CODE est optionnel (défaut: 08781477, non secret)");
    console.error("");
    console.error("   2. Ou exportez les variables d'environnement:");
    console.error("      export ID_FFTT=votre_id");
    console.error("      export PWD_FFTT=votre_mot_de_passe");
    process.exit(1);
  }

  // Configuration FFTT
  console.log("📋 Configuration des identifiants FFTT...");
  execSync(
    `firebase functions:config:set fftt.id="${ffttId}" fftt.pwd="${ffttPwd}" fftt.club_code="${ffttClubCode}"`,
    { stdio: "inherit" }
  );

  console.log("✅ Configuration terminée !");
  console.log("");
  console.log("📋 Variables configurées :");
  console.log(`  - fftt.id: ${ffttId.substring(0, 2)}*** (masqué)`);
  console.log(`  - fftt.pwd: *** (masqué)`);
  console.log(`  - fftt.club_code: ${ffttClubCode}`);
  console.log("");
  console.log("🚀 Vous pouvez maintenant déployer les Functions avec :");
  console.log("   npm run deploy:functions");
} catch (error) {
  console.error("❌ Erreur lors de la configuration :", error.message);
  process.exit(1);
}

