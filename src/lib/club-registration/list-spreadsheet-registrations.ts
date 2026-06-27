import type { Firestore } from "firebase-admin/firestore";
import {
  isMissingFirestoreIndexError,
  COLLECTION,
} from "@/lib/club-registration/list-registrations";
import {
  mapRegistrationDocToClient,
  type RegistrationClientRecord,
} from "@/lib/club-registration/map-registration-doc-to-client";

export const SPREADSHEET_SCAN_LIMIT = 500;

export type SpreadsheetRegistrationsResult = {
  registrations: RegistrationClientRecord[];
  totalCount: number;
  truncated: boolean;
};

async function fetchSpreadsheetRegistrationsIndexed(
  db: Firestore,
  limit: number
): Promise<RegistrationClientRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .orderBy("submittedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => mapRegistrationDocToClient(doc));
}

async function fetchSpreadsheetRegistrationsInMemory(
  db: Firestore,
  limit: number
): Promise<RegistrationClientRecord[]> {
  const snap = await db.collection(COLLECTION).limit(limit).get();
  return snap.docs
    .map((doc) => {
      const record = mapRegistrationDocToClient(doc);
      const submittedAtMs =
        typeof record.submittedAt === "string"
          ? Date.parse(record.submittedAt)
          : 0;
      return { record, submittedAtMs: Number.isFinite(submittedAtMs) ? submittedAtMs : 0 };
    })
    .sort((a, b) => b.submittedAtMs - a.submittedAtMs)
    .map((entry) => entry.record);
}

/** Charge jusqu'à {@link SPREADSHEET_SCAN_LIMIT} dossiers avec tous les champs client. */
export async function listSpreadsheetRegistrations(
  db: Firestore
): Promise<SpreadsheetRegistrationsResult> {
  const limit = SPREADSHEET_SCAN_LIMIT + 1;
  let registrations: RegistrationClientRecord[];

  try {
    registrations = await fetchSpreadsheetRegistrationsIndexed(db, limit);
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }
    registrations = await fetchSpreadsheetRegistrationsInMemory(db, limit);
  }

  const truncated = registrations.length > SPREADSHEET_SCAN_LIMIT;
  if (truncated) {
    registrations = registrations.slice(0, SPREADSHEET_SCAN_LIMIT);
  }

  return {
    registrations,
    totalCount: registrations.length,
    truncated,
  };
}
