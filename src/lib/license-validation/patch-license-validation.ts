import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  findRegistrationLicenseConflicts,
  formatBlockingLicenseConflictMessage,
} from "@/lib/club-registration/find-registration-license-conflicts";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import {
  isLicenseValidationStatus,
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";
import { mapRegistrationToLicenseValidationDetail } from "@/lib/license-validation/map-registration";

const FFTT_LICENSE_RE = /^[0-9]{5,12}$/;

export type LicenseValidationPatchInput = {
  ffttLicense?: unknown;
  licenseValidationStatus?: unknown;
};

export type LicenseValidationPatchResult =
  | { ok: true; data: ReturnType<typeof mapRegistrationToLicenseValidationDetail> }
  | { ok: false; status: number; error: string };

export async function patchLicenseValidation(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  body: LicenseValidationPatchInput
): Promise<LicenseValidationPatchResult> {
  const updates: Record<string, unknown> = {};
  const hasLicense = body.ffttLicense !== undefined;
  const hasStatus = body.licenseValidationStatus !== undefined;

  if (!hasLicense && !hasStatus) {
    return { ok: false, status: 400, error: "Aucun champ modifiable fourni" };
  }

  if (hasLicense) {
    if (typeof body.ffttLicense !== "string") {
      return { ok: false, status: 400, error: "Numéro de licence invalide" };
    }
    const normalized = body.ffttLicense.replace(/\D/g, "");
    if (!FFTT_LICENSE_RE.test(normalized)) {
      return {
        ok: false,
        status: 400,
        error: "Le numéro de licence doit contenir entre 5 et 12 chiffres",
      };
    }
    updates.ffttLicense = normalized;
  }

  if (hasStatus) {
    if (!isLicenseValidationStatus(body.licenseValidationStatus)) {
      return { ok: false, status: 400, error: "Statut de licence invalide" };
    }
    updates.licenseValidationStatus = body.licenseValidationStatus as LicenseValidationStatus;
    updates.licenseValidationStatusUpdatedAt = FieldValue.serverTimestamp();
    updates.licenseValidationStatusUpdatedBy = actorUid;
  }

  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  if (hasLicense) {
    const conflicts = await findRegistrationLicenseConflicts(
      db,
      updates.ffttLicense as string,
      registrationId
    );
    if (conflicts.blocking.length > 0) {
      return {
        ok: false,
        status: 409,
        error: formatBlockingLicenseConflictMessage(conflicts.blocking),
      };
    }
  }

  const now = FieldValue.serverTimestamp();
  await docRef.set({ ...updates, updatedAt: now }, { merge: true });

  const refreshed = await docRef.get();
  const detail = mapRegistrationToLicenseValidationDetail(refreshed);

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, actorUid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: {
      scope: "license_validation",
      fields: Object.keys(updates),
    },
    success: true,
  });

  return { ok: true, data: detail };
}

export async function patchLicenseValidationFromRequest(
  req: Request,
  db: Firestore,
  registrationId: string,
  actorUid: string
) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as LicenseValidationPatchInput;
  const result = await patchLicenseValidation(db, registrationId, actorUid, body);
  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }
  return jsonNoStore({ registration: result.data });
}
