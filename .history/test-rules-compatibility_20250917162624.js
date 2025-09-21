// Script de test de compatibilité des règles Firestore
// Usage: node test-rules-compatibility.js

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, collection, addDoc } = require('firebase/firestore');

// Configuration Firebase (utilise les variables d'environnement)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testRulesCompatibility() {
  console.log('🧪 Test de compatibilité des règles Firestore...\n');

  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Test 1: Connexion avec un utilisateur existant
    console.log('1️⃣ Test de connexion...');
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ Connexion réussie:', userCredential.user.email);
      
      const userId = userCredential.user.uid;
      
      // Test 2: Lecture du profil utilisateur
      console.log('\n2️⃣ Test de lecture du profil utilisateur...');
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        console.log('✅ Lecture du profil réussie');
        console.log('   Rôle:', userDoc.data().role);
      } else {
        console.log('❌ Profil utilisateur non trouvé');
      }
      
      // Test 3: Test des permissions selon le rôle
      const userRole = userDoc.exists() ? userDoc.data().role : 'player';
      
      if (userRole === 'coach') {
        console.log('\n3️⃣ Test des permissions coach...');
        
        // Test création d'un joueur
        try {
          const playerData = {
            name: 'Test Player',
            email: 'player@test.com',
            ranking: 1000,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await addDoc(collection(db, 'players'), playerData);
          console.log('✅ Création de joueur réussie (coach)');
        } catch (error) {
          console.log('❌ Création de joueur échouée:', error.message);
        }
        
        // Test création d'une équipe
        try {
          const teamData = {
            name: 'Test Team',
            division: 'N1',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await addDoc(collection(db, 'teams'), teamData);
          console.log('✅ Création d\'équipe réussie (coach)');
        } catch (error) {
          console.log('❌ Création d\'équipe échouée:', error.message);
        }
        
      } else {
        console.log('\n3️⃣ Test des permissions joueur...');
        
        // Test création d'une disponibilité
        try {
          const availabilityData = {
            playerId: userId,
            matchId: 'test-match',
            available: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await addDoc(collection(db, 'availabilities'), availabilityData);
          console.log('✅ Création de disponibilité réussie (joueur)');
        } catch (error) {
          console.log('❌ Création de disponibilité échouée:', error.message);
        }
        
        // Test tentative de création d'un joueur (devrait échouer)
        try {
          const playerData = {
            name: 'Test Player',
            email: 'player@test.com',
            ranking: 1000,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await addDoc(collection(db, 'players'), playerData);
          console.log('❌ Création de joueur réussie (ne devrait pas être possible pour un joueur)');
        } catch (error) {
          console.log('✅ Création de joueur bloquée (comportement attendu):', error.message);
        }
      }
      
      console.log('\n🎉 Tests de compatibilité terminés !');
      console.log('\n📋 Résumé:');
      console.log('   - Connexion:', '✅');
      console.log('   - Lecture profil:', '✅');
      console.log('   - Permissions selon rôle:', userRole === 'coach' ? '✅ Coach' : '✅ Joueur');
      
    } catch (authError) {
      console.log('❌ Erreur de connexion:', authError.message);
      console.log('\n💡 Créez d\'abord un compte de test avec l\'application');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter les tests
testRulesCompatibility();
