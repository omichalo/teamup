import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { effectiveLinkedAccountUids } from "@/lib/club-registration/effective-linked-accounts";

const COLLECTION = "clubRegistrations";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LinkRegistrationAccountTarget = {
  uid: string;
  email: string;
};

export type LinkRegistrationAccountResult =
  | {
      ok: true;
      previousLinkedAccountUids: string[];
      linkedAccountUids: string[];
      linkedAccountEmails: string[];
      targetEmail: string;
    }
  | { ok: false; status: 400 | 404; error: string; code?: string };

export function normalizeLinkTargetEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

export function buildLinkedAccountsFirestorePatch(params: {
  targetUid: string;
  targetEmail: string;
  actorUid: string;
}): Record<string, unknown> {
  return {
    linkedAccountUids: [params.targetUid],
    linkedAccountEmails: [params.targetEmail],
    linkedAccountsUpdatedAt: FieldValue.serverTimestamp(),
    linkedAccountsUpdatedByUid: params.actorUid,
  };
}

/**
 * Associe (remplace) le compte portail d'un dossier d'adhésion.
 * Ne modifie pas submitterUid / submitterAccountEmail / submitterRole.
 */
export async function linkRegistrationAccount(params: {
  db: Firestore;
  registrationId: string;
  actorUid: string;
  target: LinkRegistrationAccountTarget;
}): Promise<LinkRegistrationAccountResult> {
  const targetUid = params.target.uid.trim();
  const targetEmail = normalizeLinkTargetEmail(params.target.email);
  if (!targetUid || !targetEmail) {
    return {
      ok: false,
      status: 400,
      error: "Compte cible invalide.",
      code: "INVALID_TARGET",
    };
  }

  const registrationRef = params.db.collection(COLLECTION).doc(params.registrationId);
  const snap = await registrationRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const previousLinkedAccountUids = effectiveLinkedAccountUids(data);

  if (
    previousLinkedAccountUids.length === 1 &&
    previousLinkedAccountUids[0] === targetUid &&
    Array.isArray(data.linkedAccountUids)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Ce dossier est déjà associé à ce compte.",
      code: "ALREADY_LINKED",
    };
  }

  const patch = buildLinkedAccountsFirestorePatch({
    targetUid,
    targetEmail,
    actorUid: params.actorUid,
  });

  await registrationRef.update(patch);

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_ACCOUNT_LINKED, params.actorUid, {
    resource: "clubRegistration",
    resourceId: params.registrationId,
    details: {
      previousLinkedAccountUids,
      linkedAccountUids: [targetUid],
      targetEmail,
    },
    success: true,
  });

  return {
    ok: true,
    previousLinkedAccountUids,
    linkedAccountUids: [targetUid],
    linkedAccountEmails: [targetEmail],
    targetEmail,
  };
}
