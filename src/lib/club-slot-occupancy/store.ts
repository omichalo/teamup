import { isRejectedRegistration } from "@/lib/attendance/alerts";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { FieldPath, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

const SCAN_PAGE_SIZE = 500;

export async function listAllNonRejectedRegistrations(
  db: Firestore
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const results: Array<{ id: string; data: Record<string, unknown> }> = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db
      .collection(REGISTRATIONS_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(SCAN_PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const snap = await query.get();
    if (snap.empty) {
      break;
    }
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (!isRejectedRegistration(data)) {
        results.push({ id: doc.id, data });
      }
    }
    if (snap.size < SCAN_PAGE_SIZE) {
      break;
    }
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return results;
}
