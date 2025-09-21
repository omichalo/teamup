import { NextApiRequest, NextApiResponse } from "next";
import { TeamMatchesSyncService } from "@/lib/shared/team-matches-sync";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔍 Test de sauvegarde des matchs avec debug...");
    
    // Initialiser Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    
    const teamMatchesSyncService = new TeamMatchesSyncService();

    // Synchroniser les matchs pour toutes les équipes
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams();

    if (!syncResult.success || !syncResult.processedMatches) {
      throw new Error(syncResult.error || "Erreur lors de la synchronisation");
    }

    console.log(`📊 ${syncResult.processedMatches.length} matchs à sauvegarder`);

    // Grouper les matchs par équipe
    const matchesByTeam = new Map<string, any[]>();
    
    syncResult.processedMatches.forEach(match => {
      const matchIdParts = match.id.split("_");
      if (matchIdParts.length >= 2) {
        const teamId = matchIdParts[1];
        if (!matchesByTeam.has(teamId)) {
          matchesByTeam.set(teamId, []);
        }
        matchesByTeam.get(teamId)!.push(match);
      }
    });

    console.log(`📊 ${matchesByTeam.size} équipes avec des matchs`);

    // Tester la sauvegarde pour une seule équipe
    const firstTeamId = Array.from(matchesByTeam.keys())[0];
    const firstTeamMatches = matchesByTeam.get(firstTeamId) || [];
    
    console.log(`🧪 Test de sauvegarde pour l'équipe ${firstTeamId} (${firstTeamMatches.length} matchs)`);

    // Vérifier que l'équipe existe
    const teamDoc = await db.collection("teams").doc(firstTeamId).get();
    if (!teamDoc.exists) {
      throw new Error(`Équipe ${firstTeamId} n'existe pas`);
    }

    console.log(`✅ Équipe ${firstTeamId} existe: ${teamDoc.data()?.name}`);

    // Sauvegarder les matchs de cette équipe
    const batch = db.batch();
    firstTeamMatches.forEach(match => {
      const docRef = db
        .collection("teams")
        .doc(firstTeamId)
        .collection("matches")
        .doc(match.id);

      const matchData = {
        ...match,
        date: Timestamp.fromDate(match.date),
      };

      // Supprimer les propriétés undefined
      Object.keys(matchData).forEach((key) => {
        if (matchData[key] === undefined) {
          delete matchData[key];
        }
      });

      batch.set(docRef, matchData, { merge: true });
    });

    await batch.commit();
    console.log(`✅ ${firstTeamMatches.length} matchs sauvegardés pour l'équipe ${firstTeamId}`);

    // Vérifier la sauvegarde
    const savedMatchesSnapshot = await db
      .collection("teams")
      .doc(firstTeamId)
      .collection("matches")
      .get();

    console.log(`✅ ${savedMatchesSnapshot.size} matchs vérifiés dans la sous-collection`);

    res.status(200).json({
      success: true,
      message: "Test de sauvegarde réussi",
      data: {
        teamId: firstTeamId,
        matchesToSave: firstTeamMatches.length,
        matchesSaved: savedMatchesSnapshot.size
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du test",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
