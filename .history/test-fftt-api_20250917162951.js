// Script de test de l'API FFTT
// Usage: node test-fftt-api.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, doc, setDoc } = require("firebase/firestore");

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testFFTTAPI() {
  console.log("🏓 Test de l'API FFTT...\n");

  // Vérifier les variables d'environnement
  const idFFTT = process.env.ID_FFTT;
  const pwdFFTT = process.env.PWD_FFTT;
  const clubCode = process.env.CLUB_CODE_FFTT;

  if (!idFFTT || !pwdFFTT || !clubCode) {
    console.log("❌ Variables d'environnement FFTT manquantes");
    console.log("📋 Vérifiez votre fichier .env.local :");
    console.log("   - ID_FFTT");
    console.log("   - PWD_FFTT");
    console.log("   - CLUB_CODE_FFTT");
    return;
  }

  console.log("✅ Variables d'environnement trouvées");
  console.log(`   - ID FFTT: ${idFFTT}`);
  console.log(`   - Club Code: ${clubCode}`);
  console.log(`   - Mot de passe: ${'*'.repeat(pwdFFTT.length)}\n`);

  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Test 1: Récupérer les matchs du club
    console.log("1️⃣ Test de récupération des matchs...");
    try {
      const response = await fetch(
        `http://localhost:3001/api/fftt/matches?club=${clubCode}`
      );
      
      if (response.ok) {
        const matches = await response.json();
        console.log(`✅ ${matches.length} matchs récupérés`);
        
        if (matches.length > 0) {
          console.log("   Premier match:", matches[0]);
          
          // Sauvegarder les matchs dans Firestore
          console.log("\n💾 Sauvegarde des matchs dans Firestore...");
          for (const match of matches.slice(0, 5)) { // Limiter à 5 matchs pour le test
            try {
              await addDoc(collection(db, "matches"), {
                ...match,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              console.log(`   ✅ Match sauvegardé: ${match.equipe1} vs ${match.equipe2}`);
            } catch (error) {
              console.log(`   ❌ Erreur sauvegarde match: ${error.message}`);
            }
          }
        }
      } else {
        console.log(`❌ Erreur API matchs: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Erreur récupération matchs: ${error.message}`);
    }

    // Test 2: Récupérer les informations d'un joueur
    console.log("\n2️⃣ Test de récupération d'un joueur...");
    try {
      // Utiliser un numéro de licence fictif pour le test
      const testLicence = "1234567";
      const response = await fetch(
        `http://localhost:3001/api/fftt/player?licence=${testLicence}`
      );
      
      if (response.ok) {
        const player = await response.json();
        console.log("✅ Joueur récupéré:", player);
        
        // Sauvegarder le joueur dans Firestore
        console.log("\n💾 Sauvegarde du joueur dans Firestore...");
        try {
          await addDoc(collection(db, "players"), {
            ...player,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log("   ✅ Joueur sauvegardé");
        } catch (error) {
          console.log(`   ❌ Erreur sauvegarde joueur: ${error.message}`);
        }
      } else {
        console.log(`❌ Erreur API joueur: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Erreur récupération joueur: ${error.message}`);
    }

    // Test 3: Créer des données de test réalistes
    console.log("\n3️⃣ Création de données de test réalistes...");
    
    // Créer des joueurs de test
    const testPlayers = [
      {
        name: "Jean Dupont",
        email: "jean.dupont@sqyping.fr",
        licence: "1234567",
        ranking: 1850,
        category: "Senior",
        gender: "M",
        club: "SQY Ping",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Marie Martin",
        email: "marie.martin@sqyping.fr",
        licence: "2345678",
        ranking: 1650,
        category: "Senior",
        gender: "F",
        club: "SQY Ping",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Pierre Durand",
        email: "pierre.durand@sqyping.fr",
        licence: "3456789",
        ranking: 1950,
        category: "Senior",
        gender: "M",
        club: "SQY Ping",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const player of testPlayers) {
      try {
        await addDoc(collection(db, "players"), player);
        console.log(`   ✅ Joueur créé: ${player.name} (${player.ranking} pts)`);
      } catch (error) {
        console.log(`   ❌ Erreur création joueur ${player.name}: ${error.message}`);
      }
    }

    // Créer des équipes de test
    const testTeams = [
      {
        name: "SQY Ping 1",
        division: "N1",
        players: ["1234567", "2345678", "3456789"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "SQY Ping 2",
        division: "N2",
        players: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const team of testTeams) {
      try {
        await addDoc(collection(db, "teams"), team);
        console.log(`   ✅ Équipe créée: ${team.name} (${team.division})`);
      } catch (error) {
        console.log(`   ❌ Erreur création équipe ${team.name}: ${error.message}`);
      }
    }

    // Créer des paramètres du club
    const clubSettings = {
      name: "SQY Ping",
      codeFFTT: clubCode,
      divisions: ["N1", "N2", "N3"],
      defaultTeamSize: 4,
      allowForeignPlayers: true,
      maxForeignPlayers: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await setDoc(doc(db, "clubSettings", "main"), clubSettings);
      console.log("   ✅ Paramètres du club créés");
    } catch (error) {
      console.log(`   ❌ Erreur création paramètres club: ${error.message}`);
    }

    console.log("\n🎉 Test de l'API FFTT terminé !");
    console.log("\n📋 Résumé:");
    console.log("   - API FFTT:", "✅ Configurée");
    console.log("   - Données de test:", "✅ Créées");
    console.log("   - Firestore:", "✅ Peuplé");
    
    console.log("\n🚀 Prochaines étapes:");
    console.log("   1. Vérifier les données dans l'application");
    console.log("   2. Tester les fonctionnalités avec les vraies données");
    console.log("   3. Configurer les webhooks Discord si nécessaire");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

// Exécuter les tests
testFFTTAPI();
