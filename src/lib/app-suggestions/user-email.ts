import type { Firestore } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase-admin";

function normalizeEmail(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.includes("@") ? trimmed : null;
}

/** E-mail de connexion Firebase pour un utilisateur. */
export async function getUserEmailByUid(uid: string): Promise<string | null> {
  try {
    const record = await adminAuth.getUser(uid);
    return normalizeEmail(record.email);
  } catch {
    return null;
  }
}

/** E-mails des comptes marqués mainteneur app (profil Firestore). */
export async function listAppMaintainerEmails(db: Firestore): Promise<string[]> {
  const snapshot = await db
    .collection("users")
    .where("appMaintainer", "==", true)
    .get();

  const emails = await Promise.all(
    snapshot.docs.map((doc) => getUserEmailByUid(doc.id))
  );

  return [...new Set(emails.filter((email): email is string => email !== null))];
}
