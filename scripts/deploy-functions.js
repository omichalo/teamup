#!/usr/bin/env node

/**
 * Déploie les Cloud Functions FFTT (sqyping-teamup par défaut).
 * Usage: node scripts/deploy-functions.js [projectId]
 */

const { execSync } = require("child_process");

const projectId = process.argv[2] || process.env.FIREBASE_PROJECT || "sqyping-teamup";

console.log(`🚀 Déploiement des Functions Firebase (${projectId})...`);

try {
  console.log("📦 Compilation...");
  execSync("cd functions && npm run build", { stdio: "inherit" });

  console.log("☁️  Déploiement...");
  execSync(`cd functions && firebase deploy --only functions --project ${projectId}`, {
    stdio: "inherit",
  });

  console.log("");
  console.log("✅ Déploiement terminé.");
  console.log("");
  console.log("📋 Fonctions de synchro :");
  console.log("  Planifiées (6h / 6h05 / 6h10 Europe/Paris) :");
  console.log("    - syncPlayersDaily, syncTeamsDaily, syncTeamMatchesDaily");
  console.log("  Manuelles (HTTP + token Firebase) :");
  console.log("    - syncPlayersManual, syncTeamsManual, syncTeamMatchesManual");
  console.log("");
  console.log("🔍 Vérifier : firebase functions:list --project", projectId);
  console.log("📊 Logs : npm run functions:logs");
} catch (error) {
  console.error("❌ Erreur lors du déploiement :", error.message);
  process.exit(1);
}
