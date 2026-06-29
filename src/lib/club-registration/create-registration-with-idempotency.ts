import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const REGISTRATIONS_COLLECTION = "clubRegistrations";
const ATTEMPTS_COLLECTION = "clubRegistrationSubmissionAttempts";

/** Fenêtre de détection d'un doublon involontaire (double-clic, requêtes parallèles). */
export const RECENT_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export type RegistrationIdentity = {
  firstName: string;
  lastName: string;
  birthDate: string;
};

export type CreateRegistrationResult = {
  id: string;
  duplicated: boolean;
};

export async function findRecentDuplicateRegistrationId(
  db: Firestore,
  submitterUid: string,
  identity: RegistrationIdentity,
  windowMs = RECENT_DUPLICATE_WINDOW_MS
): Promise<string | null> {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - windowMs));
  const snap = await db
    .collection(REGISTRATIONS_COLLECTION)
    .where("submitterUid", "==", submitterUid)
    .where("submittedAt", ">", cutoff)
    .orderBy("submittedAt", "desc")
    .limit(20)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status === "rejected") continue;
    if (
      data.firstName === identity.firstName &&
      data.lastName === identity.lastName &&
      data.birthDate === identity.birthDate
    ) {
      return doc.id;
    }
  }
  return null;
}

export async function createRegistrationWithIdempotency(params: {
  db: Firestore;
  submitterUid: string;
  attemptId: string | null;
  documentData: Record<string, unknown>;
  identity: RegistrationIdentity;
}): Promise<CreateRegistrationResult> {
  const { db, submitterUid, attemptId, documentData, identity } = params;

  if (attemptId) {
    const attemptRef = db.collection(ATTEMPTS_COLLECTION).doc(attemptId);
    const existingAttempt = await attemptRef.get();
    if (existingAttempt.exists) {
      const data = existingAttempt.data();
      if (
        data?.submitterUid === submitterUid &&
        typeof data.registrationId === "string" &&
        data.registrationId.length > 0
      ) {
        return { id: data.registrationId, duplicated: true };
      }
    }

    const recentDuplicateId = await findRecentDuplicateRegistrationId(
      db,
      submitterUid,
      identity
    );
    if (recentDuplicateId) {
      await attemptRef.set({
        submitterUid,
        registrationId: recentDuplicateId,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: recentDuplicateId, duplicated: true };
    }

    return db.runTransaction(async (tx) => {
      const attemptSnap = await tx.get(attemptRef);
      if (attemptSnap.exists) {
        const data = attemptSnap.data();
        if (
          data?.submitterUid === submitterUid &&
          typeof data.registrationId === "string" &&
          data.registrationId.length > 0
        ) {
          return { id: data.registrationId, duplicated: true };
        }
      }

      const regRef = db.collection(REGISTRATIONS_COLLECTION).doc();
      tx.set(regRef, documentData);
      tx.set(attemptRef, {
        submitterUid,
        registrationId: regRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: regRef.id, duplicated: false };
    });
  }

  const duplicateId = await findRecentDuplicateRegistrationId(
    db,
    submitterUid,
    identity
  );
  if (duplicateId) {
    return { id: duplicateId, duplicated: true };
  }

  const docRef = await db.collection(REGISTRATIONS_COLLECTION).add(documentData);
  return { id: docRef.id, duplicated: false };
}
