import type { Firestore } from "firebase-admin/firestore";
import {
  COLLECTION,
  isMissingFirestoreIndexError,
} from "@/lib/club-registration/list-registrations";
import { SPREADSHEET_SCAN_LIMIT } from "@/lib/club-registration/list-spreadsheet-registrations";
import { backfillRegistrationSeasonLabelOnDocs } from "@/lib/club-registration/backfill-registration-season-label";
import { registrationMatchesActiveSeason } from "@/lib/club-registration/resolve-registration-season-label";
import { mapDocToAnalyticsRecord } from "./map-record";
import type { AnalyticsRegistrationRecord } from "./types";

async function fetchRegistrationDocsIndexed(db: Firestore, limit: number) {
  return db.collection(COLLECTION).orderBy("submittedAt", "desc").limit(limit).get();
}

async function fetchRegistrationDocsInMemory(db: Firestore, limit: number) {
  const snap = await db.collection(COLLECTION).limit(limit).get();
  return {
    docs: [...snap.docs].sort((a, b) => {
      const aMs = a.data().submittedAt?.toMillis?.() ?? 0;
      const bMs = b.data().submittedAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    }),
  };
}

export type ListRegistrationsForAnalyticsResult = {
  records: AnalyticsRegistrationRecord[];
  seasonLabelBackfillUpdated: number;
};

/**
 * Charge les dossiers de la saison active (même stratégie que le tableau adhésions).
 * Corrige en base les dossiers sans `seasonLabel` (rattachés à la saison courante).
 */
export async function listRegistrationsForAnalytics(
  db: Firestore,
  seasonLabel: string
): Promise<ListRegistrationsForAnalyticsResult> {
  const limit = SPREADSHEET_SCAN_LIMIT + 1;

  let snap;
  try {
    snap = await fetchRegistrationDocsIndexed(db, limit);
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }
    snap = await fetchRegistrationDocsInMemory(db, limit);
  }

  const backfill = await backfillRegistrationSeasonLabelOnDocs(db, snap.docs, seasonLabel);

  const records = snap.docs
    .filter((doc) => registrationMatchesActiveSeason(doc.data(), seasonLabel))
    .map((doc) => mapDocToAnalyticsRecord(doc.data()));

  return {
    records,
    seasonLabelBackfillUpdated: backfill.updated,
  };
}
