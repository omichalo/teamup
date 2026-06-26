import type { Firestore } from "firebase-admin/firestore";
import { USER_ROLES } from "@/lib/auth/roles";
import { getUserEmailByUid } from "@/lib/app-suggestions/user-email";

/** E-mails de connexion des comptes avec le rôle secrétaire. */
export async function listSecretaryEmails(db: Firestore): Promise<string[]> {
  const snapshot = await db
    .collection("users")
    .where("role", "==", USER_ROLES.SECRETARY)
    .get();

  const emails = await Promise.all(
    snapshot.docs.map((doc) => getUserEmailByUid(doc.id))
  );

  return [...new Set(emails.filter((email): email is string => email !== null))];
}
