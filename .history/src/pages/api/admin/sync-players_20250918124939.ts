import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Synchronisation manuelle des joueurs déclenchée");

    // Initialiser Firebase Admin
    const admin = await initializeFirebaseAdmin();
    const db = admin.firestore();

    // Initialiser l'API FFTT
    const ffttApi = new FFTTAPI(
      process.env.ID_FFTT || "SW251",
      process.env.PWD_FFTT || "XpZ31v56Jr"
    );
    await ffttApi.initialize();

    const clubCode = process.env.CLUB_CODE || "08781477";
    console.log(`📋 Synchronisation des joueurs pour le club ${clubCode}`);

    // Récupérer les joueurs depuis l'API FFTT
    const joueurs = await ffttApi.getJoueursByClub(clubCode);
    console.log(`📊 ${joueurs.length} joueurs récupérés`);

    // Sauvegarder dans Firestore
    const batch = db.batch();
    let savedCount = 0;

    for (const joueur of joueurs) {
      const joueurRef = db.collection("players").doc(joueur.licence);
      batch.set(joueurRef, {
        licence: joueur.licence,
        nom: joueur.nom,
        prenom: joueur.prenom,
        points: joueur.points,
        sexe: joueur.sexe,
        club: joueur.club,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      savedCount++;
    }

    await batch.commit();

    // Mettre à jour le timestamp de dernière synchronisation
    await db.collection("metadata").doc("lastSync").set({
      players: admin.firestore.Timestamp.now(),
      playersCount: savedCount,
    }, { merge: true });

    console.log(`✅ ${savedCount} joueurs synchronisés avec succès`);

    res.status(200).json({
      success: true,
      message: "Synchronisation des joueurs terminée",
      count: savedCount,
    });

  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation des joueurs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
