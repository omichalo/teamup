import { PlayerSyncService } from "./player-sync";
import { TeamSyncService } from "./team-sync";
import { TeamMatchesSyncService } from "./team-matches-sync";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Fonctions utilitaires partagées entre API routes et Cloud Functions
 */

export async function syncPlayers(db: Firestore) {
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

  return {
    success: true,
    playersCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} joueurs synchronisés`,
  };
}

export async function syncTeams(db: Firestore) {
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

  return {
    success: true,
    teamsCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} équipes synchronisées`,
  };
}

export async function syncTeamMatches(db: Firestore) {
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

  return {
    success: true,
    matchesCount: saveResult.saved,
    message: `Synchronisation réussie: ${saveResult.saved} matchs synchronisés`,
  };
}
