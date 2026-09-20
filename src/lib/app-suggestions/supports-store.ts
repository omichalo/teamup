import { FieldValue, type Firestore } from "firebase-admin/firestore";

const COLLECTION = "appSuggestions";

export async function setSuggestionSupport(
  db: Firestore,
  suggestionId: string,
  uid: string,
  supported: boolean
): Promise<{ supportCount: number } | null> {
  const docRef = db.collection(COLLECTION).doc(suggestionId);
  const supportRef = docRef.collection("supports").doc(uid);

  return db.runTransaction(async (tx) => {
    const suggestionSnap = await tx.get(docRef);
    if (!suggestionSnap.exists) {
      return null;
    }

    const data = suggestionSnap.data() ?? {};
    if (data.kind === "problem" || data.visibility !== "public") {
      throw new Error("Seules les idées publiques peuvent être soutenues");
    }

    const supportSnap = await tx.get(supportRef);
    const currentCount =
      typeof data.supportCount === "number" ? data.supportCount : 0;

    if (supported) {
      if (supportSnap.exists) {
        return { supportCount: currentCount };
      }
      tx.set(supportRef, { createdAt: FieldValue.serverTimestamp() });
      const next = currentCount + 1;
      tx.update(docRef, {
        supportCount: next,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { supportCount: next };
    }

    if (!supportSnap.exists) {
      return { supportCount: currentCount };
    }
    tx.delete(supportRef);
    const next = Math.max(0, currentCount - 1);
    tx.update(docRef, {
      supportCount: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { supportCount: next };
  });
}

export async function hasUserSupportedSuggestion(
  db: Firestore,
  suggestionId: string,
  uid: string
): Promise<boolean> {
  const snap = await db
    .collection(COLLECTION)
    .doc(suggestionId)
    .collection("supports")
    .doc(uid)
    .get();
  return snap.exists;
}
