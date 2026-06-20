#!/usr/bin/env node

/**
 * Configure les credentials FFTT pour Cloud Functions.
 *
 * 1. Legacy : functions.config().fftt (lu par src/lib/shared/fftt-config.ts en secours)
 * 2. Recommandé : secrets Secret Manager ID_FFTT / PWD_FFTT (liés via runWith dans functions/src/sync-runtime.ts)
 *
 * Usage: npm run functions:setup
 * Puis (prod): npm run functions:secrets:prod
 */

const { execSync } = require("child_process");
require("dotenv").config({ path: ".env.local" });

console.log("🔧 Configuration FFTT pour Cloud Functions...");

try {
  const ffttId = process.env.ID_FFTT;
  const ffttPwd = process.env.PWD_FFTT;
  const ffttClubCode = process.env.CLUB_CODE || "08781477";

  if (!ffttId || !ffttPwd) {
    console.error("❌ ID_FFTT et PWD_FFTT requis (.env.local ou variables d'environnement).");
    process.exit(1);
  }

  console.log("📋 functions.config().fftt (secours legacy)...");
  execSync(
    `firebase functions:config:set fftt.id="${ffttId}" fftt.pwd="${ffttPwd}" fftt.club_code="${ffttClubCode}"`,
    { stdio: "inherit" }
  );

  console.log("");
  console.log("✅ functions.config() mis à jour.");
  console.log("");
  console.log("⚠️  Les crons utilisent surtout les secrets ID_FFTT / PWD_FFTT.");
  console.log("   Exécutez ensuite :");
  console.log("     npm run functions:secrets:prod");
  console.log("   (saisie interactive des mêmes valeurs que App Hosting)");
  console.log("");
  console.log("🚀 Puis déployez : npm run functions:deploy:prod");
} catch (error) {
  console.error("❌ Erreur:", error.message);
  process.exit(1);
}
