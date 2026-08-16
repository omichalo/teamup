import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  findRegistrationLicenseConflicts,
  formatBlockingLicenseConflictMessage,
} from "@/lib/club-registration/find-registration-license-conflicts";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import { normalizeLicenseValidationStatus } from "@/lib/license-validation/license-validation-status";
import { mapRegistrationToLicenseValidationDetail } from "@/lib/license-validation/map-registration";
import { resolveLicenseValidationPatchFields } from "@/lib/license-validation/resolve-license-validation-patch";

export type LicenseValidationPatchInput = {
  ffttLicense?: unknown;
  licenseValidationStatus?: unknown;
};

export type LicenseValidationPatchResult =
  | { ok: true; data: ReturnType<typeof mapRegistrationToLicenseValidationDetail> }
  | { ok: false; status: number; error: string };

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function patchLicenseValidation(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  body: LicenseValidationPatchInput
): Promise<LicenseValidationPatchResult> {
  const hasLicense = body.ffttLicense !== undefined;
  const hasStatus = body.licenseValidationStatus !== undefined;
  if (!hasLicense && !hasStatus) {
    return { ok: false, status: 400, error: "Aucun champ modifiable fourni" };
  }

  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const data = snap.data() ?? {};
  const lookup =
    data.ffttLicenseLookup && typeof data.ffttLicenseLookup === "object"
      ? (data.ffttLicenseLookup as Record<string, unknown>)
      : null;
  const resolved = resolveLicenseValidationPatchFields({
    bodyLicense: body.ffttLicense,
    hasLicense,
    bodyStatus: body.licenseValidationStatus,
    hasStatus,
    currentLicense: readOptionalString(data.ffttLicense),
    currentLookupLicense: lookup ? readOptionalString(lookup.licence) : null,
    currentStatus: normalizeLicenseValidationStatus(data.licenseValidationStatus),
  });
  if (!resolved.ok) {
    return { ok: false, status: 400, error: resolved.error };
  }

  const updates: Record<string, unknown> = {};
  if (resolved.fields.ffttLicense !== undefined) {
    // Chaîne vide = vidage volontaire : au rechargement on ne reprend pas le lookup.
    updates.ffttLicense = resolved.fields.ffttLicense ?? "";
  }
  if (resolved.fields.licenseValidationStatus !== undefined) {
    updates.licenseValidationStatus = resolved.fields.licenseValidationStatus;
    updates.licenseValidationStatusUpdatedAt = FieldValue.serverTimestamp();
    updates.licenseValidationStatusUpdatedBy = actorUid;
  }

  const licenseToCheck =
    typeof updates.ffttLicense === "string" ? updates.ffttLicense : null;
  if (licenseToCheck) {
    const conflicts = await findRegistrationLicenseConflicts(
      db,
      licenseToCheck,
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
