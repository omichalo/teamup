import {
  syncPlayers,
  syncTeams,
  syncTeamMatches,
} from "../../src/lib/shared/sync-utils";
import { adminDb, FieldValue } from "./admin-app";

/**
 * Wrapper pour la synchronisation des joueurs
 */
export async function syncPlayersWrapper(): Promise<{
  success: boolean;
  playersCount: number;
  message: string;
  error?: string;
}> {
  try {
    const db = adminDb();

    // Utiliser la fonction partagée
    const result = await syncPlayers(db);

    // Mettre à jour la date de dernière synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        players: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return result;
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    return {
      success: false,
      playersCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Wrapper pour la synchronisation des équipes
 */
export async function syncTeamsWrapper(): Promise<{
  success: boolean;
  teamsCount: number;
  message: string;
  error?: string;
}> {
  try {
    const db = adminDb();

    // Utiliser la fonction partagée
    const result = await syncTeams(db);

    // Mettre à jour la date de dernière synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        teams: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return result;
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des équipes:", error);
    return {
      success: false,
      teamsCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Wrapper pour la synchronisation des matchs
 */
export async function syncTeamMatchesWrapper(): Promise<{
  success: boolean;
  matchesCount: number;
  message: string;
  error?: string;
}> {
  try {
    const db = adminDb();

    // Utiliser la fonction partagée
    const result = await syncTeamMatches(db);

    // Mettre à jour la date de dernière synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        teamMatches: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return result;
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des matchs:", error);
    return {
      success: false,
      matchesCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
