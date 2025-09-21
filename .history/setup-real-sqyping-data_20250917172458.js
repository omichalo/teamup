// Script de configuration des données réelles SQY Ping avec authentification
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Configuration Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "sqyping-teamup",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

async function setupRealSQYPingData() {
  console.log("🏓 Configuration des données réelles SQY Ping...\n");

  try {
    // Initialiser Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: "sqyping-teamup"
    });
    
    const db = getFirestore(app);
    console.log("✅ Firebase Admin initialisé");

    // Configuration des paramètres du club SQY Ping
    const clubSettings = {
      name: "SQY Ping",
      codeFFTT: "08781477",
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
      ffttApiId: "SW251",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("clubSettings").doc("main").set(clubSettings);
    console.log("✅ Paramètres du club SQY Ping configurés");

    // Créer des équipes de base pour SQY Ping
    const teams = [];
    for (let i = 1; i <= 26; i++) {
      teams.push({
        id: `sqyping_team_${i}`,
        name: `Équipe ${i}`,
        division: i <= 3 ? "N1" : i <= 6 ? "N2" : i <= 10 ? "N3" : "R1",
        players: [],
        coach: null,
        season: "2024-2025",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Sauvegarder les équipes
    const batch = db.batch();
    teams.forEach(team => {
      const docRef = db.collection("teams").doc(team.id);
      batch.set(docRef, team);
    });
    await batch.commit();
    console.log(`✅ ${teams.length} équipes SQY Ping créées`);

    console.log("\n🎉 Configuration des données réelles terminée !");
    console.log("\n📊 Données disponibles:");
    console.log("   - 26 équipes SQY Ping");
    console.log("   - Paramètres du club configurés");
    console.log("   - Structure prête pour les joueurs");

  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

setupRealSQYPingData();
