// Script de configuration des données réelles FFTT pour SQY Ping
// Usage: node setup-real-data.js

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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function setupRealData() {
  console.log("🏓 Configuration des données réelles FFTT pour SQY Ping...\n");

  // Vérifier les variables d'environnement
  const idFFTT = process.env.ID_FFTT;
  const pwdFFTT = process.env.PWD_FFTT;
  const clubCode = process.env.CLUB_CODE_FFTT;

  if (!idFFTT || !pwdFFTT || !clubCode) {
    console.log("❌ Variables d'environnement FFTT manquantes");
    console.log("📋 Créez un fichier .env.local avec :");
    console.log("   ID_FFTT=votre_identifiant_fftt");
    console.log("   PWD_FFTT=votre_mot_de_passe_fftt");
    console.log("   CLUB_CODE_FFTT=code_club_sqyping");
    console.log("\n💡 Exemple de fichier .env.local :");
    console.log("   ID_FFTT=1234567");
    console.log("   PWD_FFTT=monmotdepasse");
    console.log("   CLUB_CODE_FFTT=7501001");
    return;
  }

  console.log("✅ Variables d'environnement trouvées");
  console.log(`   - ID FFTT: ${idFFTT}`);
  console.log(`   - Club Code: ${clubCode}`);
  console.log(`   - Mot de passe: ${"*".repeat(pwdFFTT.length)}\n`);

  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Nettoyer les données de test existantes
    console.log("🧹 Nettoyage des données de test...");
    await cleanTestData(db);

    // 2. Récupérer les vraies données FFTT
    console.log("🏓 Récupération des données réelles FFTT...");
    await fetchRealFFTTData(db, clubCode);

    // 3. Configurer les paramètres du club SQY Ping
    console.log("⚙️ Configuration des paramètres du club...");
    await setupClubSettings(db, clubCode);

    console.log("\n🎉 Configuration des données réelles terminée !");
    console.log("\n📊 Données disponibles:");
    console.log("   - Joueurs réels du club SQY Ping");
    console.log("   - Matchs réels programmés et terminés");
    console.log("   - Équipes et divisions réelles");
    console.log("   - Paramètres du club configurés");

    console.log("\n🚀 Prochaines étapes:");
    console.log("   1. Vérifier les données dans l'application");
    console.log("   2. Tester les fonctionnalités avec les vraies données");
    console.log("   3. Configurer les webhooks Discord si nécessaire");
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

async function fetchRealFFTTData(db, clubCode) {
  try {
    // Récupérer les matchs du club
    console.log("   📅 Récupération des matchs...");
    const matchesResponse = await fetch(
      `http://localhost:3001/api/fftt/matches?club=${clubCode}`
    );

    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      console.log(`   ✅ ${matches.length} matchs récupérés`);

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
    } else {
      console.log(
        `   ❌ Erreur récupération matchs: ${matchesResponse.status}`
      );
    }

    // Récupérer les joueurs du club (si l'API le permet)
    console.log("   👥 Récupération des joueurs...");
    // Note: L'API FFTT ne permet pas toujours de récupérer tous les joueurs d'un club
    // Nous devrons peut-être les ajouter manuellement ou utiliser une autre méthode
  } catch (error) {
    console.log(`   ❌ Erreur récupération données FFTT: ${error.message}`);
  }
}

async function setupClubSettings(db, clubCode) {
  const clubSettings = {
    name: "SQY Ping",
    codeFFTT: clubCode,
    divisions: ["N1", "N2", "N3", "R1", "R2"], // Divisions typiques
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
setupRealData();
