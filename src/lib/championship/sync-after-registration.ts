import type { Firestore } from "firebase-admin/firestore";
import { readPublishedSeasonLabel } from "./season-label";
import { syncChampionshipRosterFromRegistration } from "./seed-from-registration";

/** Recalcule l'entrée roster du dossier. Les erreurs sont loguées, jamais remontées. */
export async function syncRosterAfterRegistrationChange(
  db: Firestore,
  registrationId: string
): Promise<void> {
  try {
    const seasonLabel = await readPublishedSeasonLabel(db);
    await syncChampionshipRosterFromRegistration(db, seasonLabel, registrationId);
  } catch (error) {
    console.error(
      "[championship] sync roster after registration failed",
      registrationId,
      error
    );
  }
}
