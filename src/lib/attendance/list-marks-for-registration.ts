import type { Firestore } from "firebase-admin/firestore";
import { ATTENDANCE_MARKS_COLLECTION } from "./constants";
import { mapMarkDoc } from "./store";
import type { AttendanceMark } from "./types";

/** Historique de pointage d'un dossier (index registrationId + date). */
export async function listMarksForRegistration(
  db: Firestore,
  registrationId: string
): Promise<AttendanceMark[]> {
  const snap = await db
    .collection(ATTENDANCE_MARKS_COLLECTION)
    .where("registrationId", "==", registrationId)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => mapMarkDoc(doc.id, doc.data()));
}
