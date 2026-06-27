import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  SPREADSHEET_PREFERENCES_COLLECTION,
  SPREADSHEET_PREFERENCES_FIELD,
  getDefaultSpreadsheetPreferences,
  normalizeSpreadsheetPreferences,
  type RegistrationsSpreadsheetPreferences,
} from "./preferences";

function readPreferencesFromDoc(
  data: FirebaseFirestore.DocumentData | undefined
): RegistrationsSpreadsheetPreferences {
  if (!data) {
    return getDefaultSpreadsheetPreferences();
  }
  return normalizeSpreadsheetPreferences(data[SPREADSHEET_PREFERENCES_FIELD]);
}

export async function loadRegistrationsSpreadsheetPreferences(
  db: Firestore,
  uid: string
): Promise<RegistrationsSpreadsheetPreferences> {
  const snap = await db.collection(SPREADSHEET_PREFERENCES_COLLECTION).doc(uid).get();
  return readPreferencesFromDoc(snap.data());
}

export async function saveRegistrationsSpreadsheetPreferences(
  db: Firestore,
  uid: string,
  preferences: RegistrationsSpreadsheetPreferences
): Promise<RegistrationsSpreadsheetPreferences> {
  const normalized = normalizeSpreadsheetPreferences(preferences);
  const payload = {
    [SPREADSHEET_PREFERENCES_FIELD]: {
      columns: normalized.columns,
      columnWidths: normalized.columnWidths ?? {},
      activeViewId: normalized.activeViewId ?? null,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(SPREADSHEET_PREFERENCES_COLLECTION).doc(uid).set(payload, { merge: true });

  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
}
