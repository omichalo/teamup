import type { Firestore } from "firebase-admin/firestore";

export async function isUserAppMaintainer(
  db: Firestore,
  uid: string
): Promise<boolean> {
  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    return false;
  }
  return snapshot.data()?.appMaintainer === true;
}
