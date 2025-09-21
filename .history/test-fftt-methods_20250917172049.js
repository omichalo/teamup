// Test des méthodes disponibles dans FFTT API
const { FFTTAPI } = require('@omichalo/ffttapi-node');

async function testFFTTMethods() {
  try {
    const api = new FFTTAPI('SW251', 'XpZ31v56Jr');
    console.log('✅ API créée avec succès');
    
    // Lister les méthodes disponibles
    console.log('\n📋 Méthodes disponibles:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
      .filter(name => typeof api[name] === 'function' && name !== 'constructor');
    
    methods.forEach(method => {
      console.log(`   - ${method}`);
    });
    
    // Tester l'initialisation
    console.log('\n🔐 Test d\'initialisation...');
    try {
      await api.initialize();
      console.log('✅ API initialisée avec succès');
    } catch (error) {
      console.log('❌ Erreur initialisation:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
  }
}

testFFTTMethods();
