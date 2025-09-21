const fs = require('fs');
const path = require('path');

// Nouvelles valeurs Firebase correctes
const newEnvValues = {
  'NEXT_PUBLIC_FIREBASE_API_KEY': 'AIzaSyC9fsfuDqF0jjV8ocgCtqMpcPA-E6pZoNg',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': 'sqyping-teamup.firebaseapp.com',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': 'sqyping-teamup',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': 'sqyping-teamup.firebasestorage.app',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': '567392028186',
  'NEXT_PUBLIC_FIREBASE_APP_ID': '1:567392028186:web:0fa11cf39ce060931eb3a3'
};

const envPath = path.join(__dirname, '.env.local');

try {
  // Lire le fichier .env.local
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Mettre à jour chaque variable
  Object.entries(newEnvValues).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`✅ Mis à jour: ${key}`);
    } else {
      console.log(`⚠️  Variable non trouvée: ${key}`);
    }
  });
  
  // Écrire le fichier mis à jour
  fs.writeFileSync(envPath, envContent);
  console.log('🎉 Fichier .env.local mis à jour avec succès !');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour:', error.message);
}
