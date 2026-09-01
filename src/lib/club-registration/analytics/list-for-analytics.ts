import type { Firestore } from "firebase-admin/firestore";
import {
  COLLECTION,
  isMissingFirestoreIndexError,
} from "@/lib/club-registration/list-registrations";
import { SPREADSHEET_SCAN_LIMIT } from "@/lib/club-registration/list-spreadsheet-registrations";
import { backfillRegistrationSeasonLabelOnDocs } from "@/lib/club-registration/backfill-registration-season-label";
import { readKnownFfttLicenseFromRegistrationData } from "@/lib/license-validation/known-fftt-license";
import { registrationMatchesActiveSeason } from "@/lib/club-registration/resolve-registration-season-label";
import { getPlayerFfttMirrorsByLicence } from "@/lib/players/fftt-mirror";
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

  const seasonDocs = snap.docs.filter((doc) =>
    registrationMatchesActiveSeason(doc.data(), seasonLabel)
  );
  const licences = seasonDocs
    .map((doc) => readKnownFfttLicenseFromRegistrationData(doc.data()))
    .filter((licence): licence is string => licence !== null);
  const ffttMirrors = await getPlayerFfttMirrorsByLicence(db, licences);

  const records = seasonDocs.map((doc) => {
    const data = doc.data();
    const licence = readKnownFfttLicenseFromRegistrationData(data);
    const ffttMirror = licence ? (ffttMirrors.get(licence) ?? null) : null;
    return mapDocToAnalyticsRecord(data, { ffttMirror });
  });

  return {
    records,
    seasonLabelBackfillUpdated: backfill.updated,
  };
}
