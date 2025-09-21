import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧹 Nettoyage des doublons de joueurs direct");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Récupérer tous les joueurs
    const playersSnapshot = await db.collection("players").get();
    console.log(
      `📊 ${playersSnapshot.size} documents trouvés dans la collection players`
    );

    const playersByLicence = new Map();
    const duplicatesToDelete: string[] = [];

    // Analyser les documents
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      const licence = data.licence;

      if (!licence) {
        console.log(`⚠️ Document ${doc.id} sans licence, à supprimer`);
        duplicatesToDelete.push(doc.id);
        return;
      }

      // Si l'ID du document est le numéro de licence, c'est correct
      if (doc.id === licence) {
        if (playersByLicence.has(licence)) {
          console.log(
            `⚠️ Doublon trouvé pour licence ${licence}, document ${doc.id} à supprimer`
          );
          duplicatesToDelete.push(doc.id);
        } else {
          playersByLicence.set(licence, doc);
        }
      } else {
        // Si l'ID n'est pas la licence, c'est probablement un doublon
        if (playersByLicence.has(licence)) {
          console.log(
            `⚠️ Doublon trouvé pour licence ${licence}, document ${doc.id} à supprimer`
          );
          duplicatesToDelete.push(doc.id);
        } else {
          // Garder ce document mais le renommer avec la licence comme ID
          playersByLicence.set(licence, doc);
          duplicatesToDelete.push(doc.id);
        }
      }
    });

    console.log(`🗑️ ${duplicatesToDelete.length} documents à supprimer`);

    // Supprimer les doublons par batch
    let deletedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
      const batch = db.batch();
      const batchEnd = Math.min(i + batchSize, duplicatesToDelete.length);

      for (let j = i; j < batchEnd; j++) {
        const docId = duplicatesToDelete[j];
        const docRef = db.collection("players").doc(docId);
        batch.delete(docRef);
        deletedCount++;
      }

      await batch.commit();
      console.log(`✅ ${deletedCount} documents supprimés`);
    }

    console.log(`✅ Nettoyage terminé: ${deletedCount} doublons supprimés`);

    res.status(200).json({
      success: true,
      message: "Nettoyage des doublons terminé",
      data: {
        deletedCount,
        remainingCount: playersByLicence.size,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du nettoyage des doublons",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);