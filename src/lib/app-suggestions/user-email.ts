import type {
  Firestore,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { USER_ROLES } from "@/lib/auth/roles";
import { adminAuth } from "@/lib/firebase-admin";
import {
  allowsSuggestionEmail,
  resolveSuggestionEmailPreference,
  type SuggestionEmailPreference,
} from "@/lib/app-suggestions/email-preferences";
import type { SuggestionDomain } from "@/lib/app-suggestions/types";

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

export async function getSuggestionEmailPreference(
  db: Firestore,
  uid: string
): Promise<SuggestionEmailPreference> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    return "all";
  }
  return resolveSuggestionEmailPreference(
    snap.get("suggestionEmailPreference")
  );
}

async function listEmailsForUids(uids: string[]): Promise<string[]> {
  const emails = await Promise.all(uids.map((uid) => getUserEmailByUid(uid)));
  return [...new Set(emails.filter((email): email is string => email !== null))];
}

/** E-mails des comptes marqués mainteneur app (profil Firestore). */
export async function listAppMaintainerEmails(db: Firestore): Promise<string[]> {
  const snapshot = await db
    .collection("users")
    .where("appMaintainer", "==", true)
    .get();

  return listEmailsForUids(snapshot.docs.map((doc) => doc.id));
}

/** E-mails secrétariat (référents club). */
export async function listClubReferentEmails(db: Firestore): Promise<string[]> {
  const [secretaries, assistants] = await Promise.all([
    db.collection("users").where("role", "==", USER_ROLES.SECRETARY).get(),
    db
      .collection("users")
      .where("role", "==", USER_ROLES.ASSISTANT_SECRETARY)
      .get(),
  ]);

  return listEmailsForUids([
    ...secretaries.docs.map((doc) => doc.id),
    ...assistants.docs.map((doc) => doc.id),
  ]);
}

/**
 * Destinataires handlers selon le domaine, hors auteur, en tenant compte
 * des préférences e-mail.
 */
export async function listHandlerEmailsForDomain(
  db: Firestore,
  domain: SuggestionDomain,
  options: {
    excludeUid?: string;
    emailKind: "problem" | "improvement" | "comment";
  }
): Promise<string[]> {
  const maintainerSnap = await db
    .collection("users")
    .where("appMaintainer", "==", true)
    .get();

  const handlerDocs: QueryDocumentSnapshot[] = [...maintainerSnap.docs];

  if (domain === "club") {
    const [secretaries, assistants] = await Promise.all([
      db.collection("users").where("role", "==", USER_ROLES.SECRETARY).get(),
      db
        .collection("users")
        .where("role", "==", USER_ROLES.ASSISTANT_SECRETARY)
        .get(),
    ]);
    handlerDocs.push(...secretaries.docs, ...assistants.docs);
  }

  const byUid = new Map<string, QueryDocumentSnapshot>();
  for (const doc of handlerDocs) {
    byUid.set(doc.id, doc);
  }

  const excludeEmail = options.excludeUid
    ? (await getUserEmailByUid(options.excludeUid))?.toLowerCase() ?? null
    : null;

  const emails: string[] = [];
  for (const [uid, doc] of byUid) {
    if (options.excludeUid && uid === options.excludeUid) {
      continue;
    }
    const preference = resolveSuggestionEmailPreference(
      doc.get("suggestionEmailPreference")
    );
    if (!allowsSuggestionEmail(preference, options.emailKind)) {
      continue;
    }
    const email = await getUserEmailByUid(uid);
    if (!email) {
      continue;
    }
    if (excludeEmail && email.toLowerCase() === excludeEmail) {
      continue;
    }
    emails.push(email);
  }

  return [...new Set(emails)];
}
