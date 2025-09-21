#!/usr/bin/env node

/**
 * Script pour déployer les Functions Firebase
 * Usage: node scripts/deploy-functions.js
 */

const { execSync } = require('child_process');

console.log('🚀 Déploiement des Functions Firebase...');

try {
  // Compiler les Functions
  console.log('📦 Compilation des Functions...');
  execSync('cd functions && npm run build', { stdio: 'inherit' });
  
  // Déployer les Functions
  console.log('☁️  Déploiement vers Firebase...');
  execSync('cd functions && npm run deploy', { stdio: 'inherit' });
  
  console.log('✅ Déploiement terminé !');
  console.log('');
  console.log('📋 Functions déployées :');
  console.log('  - syncMatches: Synchronisation automatique quotidienne à 2h');
  console.log('  - triggerMatchSync: Synchronisation manuelle via HTTP');
  console.log('');
  console.log('🔗 URLs des Functions :');
  console.log('  - Synchronisation manuelle: https://us-central1-sqyping-teamup.cloudfunctions.net/triggerMatchSync');
  console.log('');
  console.log('📊 Pour voir les logs :');
  console.log('   npm run functions:logs');
  
} catch (error) {
  console.error('❌ Erreur lors du déploiement :', error.message);
  process.exit(1);
}