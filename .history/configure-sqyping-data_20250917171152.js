// Script de configuration des données réelles SQY Ping
// Usage: node configure-sqyping-data.js

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} = require("firebase/firestore");

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC9fsfuDqF0jjV8ocgCtqMpcPA-E6pZoNg",
  authDomain: "sqyping-teamup.firebaseapp.com",
  projectId: "sqyping-teamup",
  storageBucket: "sqyping-teamup.firebasestorage.app",
  messagingSenderId: "567392028186",
  appId: "1:567392028186:web:0fa11cf39ce060931eb3a3",
};

// Identifiants FFTT pour SQY Ping
const FFTT_CONFIG = {
  id: "SW251",
  pwd: "XpZ31v56Jr",
  clubCode: "08781477",
};

async function configureSQYPingData() {
  console.log("🏓 Configuration des données réelles SQY Ping...\n");
  console.log("📋 Identifiants FFTT:");
  console.log(`   - ID: ${FFTT_CONFIG.id}`);
  console.log(`   - Club Code: ${FFTT_CONFIG.clubCode}`);
  console.log(`   - Mot de passe: ${"*".repeat(FFTT_CONFIG.pwd.length)}\n`);

  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Nettoyer les données de test existantes
    console.log("🧹 Nettoyage des données de test...");
    await cleanTestData(db);

    // 2. Récupérer les vraies données FFTT
    console.log("🏓 Récupération des données réelles FFTT...");
    await fetchRealFFTTData(db);

    // 3. Configurer les paramètres du club SQY Ping
    console.log("⚙️ Configuration des paramètres du club...");
    await setupClubSettings(db);

    console.log("\n🎉 Configuration des données réelles terminée !");
    console.log("\n📊 Données disponibles:");
    console.log("   - Matchs réels de SQY Ping");
    console.log("   - Équipes et divisions réelles");
    console.log("   - Paramètres du club configurés");

    console.log("\n🚀 Prochaines étapes:");
    console.log("   1. Vérifier les données dans l'application");
    console.log("   2. Tester les fonctionnalités avec les vraies données");
    console.log("   3. Ajouter les joueurs manuellement si nécessaire");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

async function cleanTestData(db) {
  try {
    // Supprimer les données de test existantes
    const collections = [
      "players",
      "teams",
      "matches",
      "availabilities",
      "compositions",
    ];

    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`   ✅ ${collectionName} nettoyés`);
    }
  } catch (error) {
    console.log(`   ⚠️ Erreur nettoyage: ${error.message}`);
  }
}

async function fetchRealFFTTData(db) {
  try {
    // Récupérer les matchs du club SQY Ping
    console.log("   📅 Récupération des matchs SQY Ping...");
    const matchesResponse = await fetch(
      `http://localhost:3001/api/fftt/matches?club=${FFTT_CONFIG.clubCode}`
    );

    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      console.log(`   ✅ ${matches.length} matchs récupérés`);

      if (matches.length > 0) {
        console.log("   📋 Exemple de match:", matches[0]);

        // Sauvegarder les matchs dans Firestore
        for (const match of matches) {
          try {
            await addDoc(collection(db, "matches"), {
              ...match,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch (error) {
            console.log(`   ❌ Erreur sauvegarde match: ${error.message}`);
          }
        }
        console.log(`   💾 ${matches.length} matchs sauvegardés`);
      }
    } else {
      console.log(`   ❌ Erreur récupération matchs: ${matchesResponse.status}`);
      const errorText = await matchesResponse.text();
      console.log(`   Détails: ${errorText}`);
    }

    // Récupérer les informations d'un joueur de test
    console.log("   👥 Test récupération joueur...");
    try {
      const playerResponse = await fetch(
        `http://localhost:3001/api/fftt/player?licence=1234567`
      );

      if (playerResponse.ok) {
        const player = await playerResponse.json();
        console.log("   ✅ Test joueur réussi:", player);
      } else {
        console.log(`   ⚠️ Test joueur échoué: ${playerResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Erreur test joueur: ${error.message}`);
    }

  } catch (error) {
    console.log(`   ❌ Erreur récupération données FFTT: ${error.message}`);
  }
}

async function setupClubSettings(db) {
  const clubSettings = {
    name: "SQY Ping",
    codeFFTT: FFTT_CONFIG.clubCode,
    divisions: ["N1", "N2", "N3", "R1", "R2", "R3"],
    defaultTeamSize: 4,
    allowForeignPlayers: true,
    maxForeignPlayers: 1,
    allowFemalePlayers: true,
    minFemalePlayers: 1,
    venue: "Gymnase SQY Ping",
    address: "SQY Ping, France",
    phone: "",
    email: "contact@sqyping.fr",
    website: "",
    season: "2024-2025",
    ffttApiId: FFTT_CONFIG.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await setDoc(doc(db, "clubSettings", "main"), clubSettings);
    console.log("   ✅ Paramètres du club SQY Ping configurés");
  } catch (error) {
    console.log(`   ❌ Erreur configuration club: ${error.message}`);
  }
}

// Exécuter la configuration
configureSQYPingData();
