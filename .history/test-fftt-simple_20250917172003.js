// Test simple de la dépendance FFTT API
const { FFTTAPI } = require('@omichalo/ffttapi-node');

console.log('FFTTAPI type:', typeof FFTTAPI);
console.log('FFTTAPI constructor:', FFTTAPI);

try {
  const api = new FFTTAPI({
    id: 'SW251',
    pwd: 'XpZ31v56Jr'
  });
  console.log('✅ API créée avec succès');
  console.log('API object:', api);
} catch (error) {
  console.log('❌ Erreur création API:', error.message);
  console.log('Stack:', error.stack);
}
