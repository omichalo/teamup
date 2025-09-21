// Script de création de données de test réalistes
// Usage: node create-test-data.js

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

async function createTestData() {
  console.log("🏓 Création de données de test réalistes...\n");

  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Créer des joueurs réalistes
    console.log("1️⃣ Création des joueurs...");
    const players = [
      {
        name: "Jean Dupont",
        email: "jean.dupont@sqyping.fr",
        licence: "1234567",
        ranking: 1850,
        category: "Senior",
        gender: "M",
        club: "SQY Ping",
        phone: "06 12 34 56 78",
        birthDate: "1985-03-15",
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
        phone: "06 23 45 67 89",
        birthDate: "1990-07-22",
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
        phone: "06 34 56 78 90",
        birthDate: "1988-11-08",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Sophie Bernard",
        email: "sophie.bernard@sqyping.fr",
        licence: "4567890",
        ranking: 1750,
        category: "Senior",
        gender: "F",
        club: "SQY Ping",
        phone: "06 45 67 89 01",
        birthDate: "1992-05-14",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Thomas Leroy",
        email: "thomas.leroy@sqyping.fr",
        licence: "5678901",
        ranking: 2050,
        category: "Senior",
        gender: "M",
        club: "SQY Ping",
        phone: "06 56 78 90 12",
        birthDate: "1987-09-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Julie Moreau",
        email: "julie.moreau@sqyping.fr",
        licence: "6789012",
        ranking: 1550,
        category: "Senior",
        gender: "F",
        club: "SQY Ping",
        phone: "06 67 89 01 23",
        birthDate: "1995-12-03",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const playerIds = [];
    for (const player of players) {
      try {
        const docRef = await addDoc(collection(db, "players"), player);
        playerIds.push(docRef.id);
        console.log(`   ✅ Joueur créé: ${player.name} (${player.ranking} pts)`);
      } catch (error) {
        console.log(`   ❌ Erreur création joueur ${player.name}: ${error.message}`);
      }
    }

    // 2. Créer des équipes
    console.log("\n2️⃣ Création des équipes...");
    const teams = [
      {
        name: "SQY Ping 1",
        division: "N1",
        players: playerIds.slice(0, 4), // Top 4 joueurs
        captain: playerIds[0], // Jean Dupont
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "SQY Ping 2",
        division: "N2",
        players: playerIds.slice(4), // Autres joueurs
        captain: playerIds[4], // Thomas Leroy
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const teamIds = [];
    for (const team of teams) {
      try {
        const docRef = await addDoc(collection(db, "teams"), team);
        teamIds.push(docRef.id);
        console.log(`   ✅ Équipe créée: ${team.name} (${team.division})`);
      } catch (error) {
        console.log(`   ❌ Erreur création équipe ${team.name}: ${error.message}`);
      }
    }

    // 3. Créer des matchs
    console.log("\n3️⃣ Création des matchs...");
    const matches = [
      {
        homeTeam: "SQY Ping 1",
        awayTeam: "AS Paris TT",
        division: "N1",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
        time: "20:00",
        venue: "Gymnase SQY Ping",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        homeTeam: "SQY Ping 2",
        awayTeam: "Club 92 TT",
        division: "N2",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
        time: "19:30",
        venue: "Gymnase SQY Ping",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        homeTeam: "SQY Ping 1",
        awayTeam: "Racing Club TT",
        division: "N1",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Il y a 7 jours
        time: "20:00",
        venue: "Gymnase SQY Ping",
        status: "completed",
        homeScore: 4,
        awayScore: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const matchIds = [];
    for (const match of matches) {
      try {
        const docRef = await addDoc(collection(db, "matches"), match);
        matchIds.push(docRef.id);
        console.log(`   ✅ Match créé: ${match.homeTeam} vs ${match.awayTeam}`);
      } catch (error) {
        console.log(`   ❌ Erreur création match: ${error.message}`);
      }
    }

    // 4. Créer des disponibilités
    console.log("\n4️⃣ Création des disponibilités...");
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = 0; j < matchIds.length; j++) {
        const availability = {
          playerId: playerIds[i],
          matchId: matchIds[j],
          available: Math.random() > 0.3, // 70% de disponibilité
          reason: Math.random() > 0.7 ? "Travail" : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await addDoc(collection(db, "availabilities"), availability);
          const player = players[i];
          const match = matches[j];
          console.log(`   ✅ Disponibilité: ${player.name} pour ${match.homeTeam} vs ${match.awayTeam}`);
        } catch (error) {
          console.log(`   ❌ Erreur création disponibilité: ${error.message}`);
        }
      }
    }

    // 5. Créer des compositions
    console.log("\n5️⃣ Création des compositions...");
    const compositions = [
      {
        name: "Composition N1 - Semaine 1",
        teamId: teamIds[0],
        matchId: matchIds[0],
        players: playerIds.slice(0, 4),
        formation: "4-0-0", // 4 joueurs, 0 remplaçants
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Composition N2 - Semaine 1",
        teamId: teamIds[1],
        matchId: matchIds[1],
        players: playerIds.slice(4),
        formation: "2-0-0", // 2 joueurs, 0 remplaçants
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const composition of compositions) {
      try {
        await addDoc(collection(db, "compositions"), composition);
        console.log(`   ✅ Composition créée: ${composition.name}`);
      } catch (error) {
        console.log(`   ❌ Erreur création composition: ${error.message}`);
      }
    }

    // 6. Créer les paramètres du club
    console.log("\n6️⃣ Création des paramètres du club...");
    const clubSettings = {
      name: "SQY Ping",
      codeFFTT: process.env.CLUB_CODE_FFTT || "7501001",
      divisions: ["N1", "N2", "N3"],
      defaultTeamSize: 4,
      allowForeignPlayers: true,
      maxForeignPlayers: 1,
      allowFemalePlayers: true,
      minFemalePlayers: 1,
      venue: "Gymnase SQY Ping",
      address: "123 Rue du Sport, 75000 Paris",
      phone: "01 23 45 67 89",
      email: "contact@sqyping.fr",
      website: "https://sqyping.fr",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await setDoc(doc(db, "clubSettings", "main"), clubSettings);
      console.log("   ✅ Paramètres du club créés");
    } catch (error) {
      console.log(`   ❌ Erreur création paramètres club: ${error.message}`);
    }

    // 7. Créer des enregistrements de brûlage
    console.log("\n7️⃣ Création des enregistrements de brûlage...");
    const burnRecords = [
      {
        playerId: playerIds[0],
        matchId: matchIds[2],
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reason: "Match important",
        approved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const burnRecord of burnRecords) {
      try {
        await addDoc(collection(db, "burnRecords"), burnRecord);
        console.log(`   ✅ Enregistrement de brûlage créé`);
      } catch (error) {
        console.log(`   ❌ Erreur création enregistrement brûlage: ${error.message}`);
      }
    }

    console.log("\n🎉 Données de test créées avec succès !");
    console.log("\n📊 Résumé des données créées:");
    console.log(`   - ${players.length} joueurs`);
    console.log(`   - ${teams.length} équipes`);
    console.log(`   - ${matches.length} matchs`);
    console.log(`   - ${playerIds.length * matchIds.length} disponibilités`);
    console.log(`   - ${compositions.length} compositions`);
    console.log(`   - 1 configuration du club`);
    console.log(`   - ${burnRecords.length} enregistrements de brûlage`);

    console.log("\n🚀 Prochaines étapes:");
    console.log("   1. Vérifier les données dans l'application");
    console.log("   2. Tester les fonctionnalités avec les données réalistes");
    console.log("   3. Configurer l'API FFTT pour les vraies données");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

// Exécuter la création des données
createTestData();
