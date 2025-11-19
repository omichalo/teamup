import { PlayerSyncService } from "./player-sync";
import { TeamSyncService } from "./team-sync";
import { TeamMatchesSyncService } from "./team-matches-sync";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Fonctions utilitaires partagées entre API routes et Cloud Functions
 */

export async function syncPlayers(db: Firestore) {
  const startTime = Date.now();
  const playerSyncService = new PlayerSyncService();
  const syncResult = await playerSyncService.syncPlayers();

  if (!syncResult.success || !syncResult.processedPlayers) {
    throw new Error(
      syncResult.error || "Erreur lors de la synchronisation des joueurs"
    );
  }

  const saveResult = await playerSyncService.savePlayersToFirestore(
    syncResult.processedPlayers,
    db
  );

  const duration = Date.now() - startTime;
  const durationSeconds = Math.round(duration / 1000);

  // Sauvegarder la durée dans les métadonnées
  await db.collection("metadata").doc("lastSync").set(
    {
      playersDuration: durationSeconds,
    },
    { merge: true }
  );

  return {
    success: true,
    playersCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} joueurs synchronisés`,
    duration: durationSeconds,
  };
}

export async function syncTeams(db: Firestore) {
  const startTime = Date.now();
  const teamSyncService = new TeamSyncService();
  const syncResult = await teamSyncService.syncTeamsAndMatches();

  if (!syncResult.success || !syncResult.processedTeams) {
    throw new Error(
      syncResult.error || "Erreur lors de la synchronisation des équipes"
    );
  }

  const saveResult = await teamSyncService.saveTeamsAndMatchesToFirestore(
    syncResult.processedTeams,
    db
  );

  const duration = Date.now() - startTime;
  const durationSeconds = Math.round(duration / 1000);

  // Sauvegarder la durée dans les métadonnées
  await db.collection("metadata").doc("lastSync").set(
    {
      teamsDuration: durationSeconds,
    },
    { merge: true }
  );

  return {
    success: true,
    teamsCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} équipes synchronisées`,
    duration: durationSeconds,
  };
}

export async function syncTeamMatches(db: Firestore) {
  const startTime = Date.now();
  const teamMatchesSyncService = new TeamMatchesSyncService();
  const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams(db);

  if (!syncResult.success || !syncResult.processedMatches) {
    throw new Error(
      syncResult.error || "Erreur lors de la synchronisation des matchs"
    );
  }

  const saveResult =
    await teamMatchesSyncService.saveMatchesToTeamSubcollections(
      syncResult.processedMatches,
      db
    );

  const duration = Date.now() - startTime;
  const durationSeconds = Math.round(duration / 1000);

  // Sauvegarder la durée et le nombre de matchs dans les métadonnées
  await db.collection("metadata").doc("lastSync").set(
    {
      teamMatches: Timestamp.fromDate(new Date()),
      teamMatchesCount: saveResult.saved,
      teamMatchesDuration: durationSeconds,
    },
    { merge: true }
  );

  return {
    success: true,
    matchesCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} matchs synchronisés`,
    duration: durationSeconds,
  };
}
