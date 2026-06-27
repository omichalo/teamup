import type { Firestore } from "firebase-admin/firestore";
import { fetchUserLabels } from "@/lib/auth/resolve-display-name";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  collectSpreadsheetUserUids,
  serializeUserLabelDirectory,
  type SpreadsheetUserLabelDirectory,
} from "./user-labels";

export async function buildSpreadsheetUserLabelDirectory(
  db: Firestore,
  registrations: readonly RegistrationClientRecord[]
): Promise<SpreadsheetUserLabelDirectory> {
  const uids = collectSpreadsheetUserUids(registrations);
  const labels = await fetchUserLabels(db, uids);
  return serializeUserLabelDirectory(labels);
}
