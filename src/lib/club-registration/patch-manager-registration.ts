import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import {
  isMedicalCertificateStatus,
  normalizeMedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import { buildManagerRegistrationPricingPatch } from "@/lib/club-registration/build-manager-registration-pricing-patch";
import { resolveManagerPaymentAidsUpdate } from "@/lib/club-registration/build-manager-registration-aids-patch";
import {
  ensureRegistrationConfigSeeded,
  getActiveRegistrationConfig,
} from "@/lib/club-registration-config/store";
import { isValidVoluntaryDonationCents } from "@/lib/pricing/donation-discount";
import {
  APPLICANT_NOTES_MAX_LENGTH,
  isApplicantNotesTooLong,
  normalizeApplicantNotes,
} from "@/lib/club-registration/applicant-notes";
import {
  findRegistrationLicenseConflicts,
  formatBlockingLicenseConflictMessage,
} from "@/lib/club-registration/find-registration-license-conflicts";
import { MANAGER_EDITABLE_FIELDS } from "@/lib/club-registration/registration-api-fields";
import { ffttLicenseLookupSchema } from "@/lib/club-registration/schema-base";
import { normalizeRegistrationLastNamePatch } from "@/lib/shared/person-name-format";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;
const FFTT_LICENSE_RE = /^[0-9]{5,12}$/;

export async function patchManagerRegistration(
  req: Request,
  registrationId: string,
  sessionCookie: string,
  db: Firestore
) {
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const role = resolveRole(decoded.role as string | undefined);
  if (!hasAnyRole(role, MANAGER_ROLES)) {
    return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
  }

  const body = ((await req.json()) ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const field of MANAGER_EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonNoStore({ error: "Aucun champ modifiable fourni" }, { status: 400 });
  }

  Object.assign(updates, normalizeRegistrationLastNamePatch(updates));

  if (updates.applicantNotes !== undefined) {
    if (typeof updates.applicantNotes !== "string") {
      return jsonNoStore({ error: "Précisions de l'inscrit invalides" }, { status: 400 });
    }
    if (isApplicantNotesTooLong(updates.applicantNotes)) {
      return jsonNoStore(
        {
          error: `Les précisions de l'inscrit ne peuvent pas dépasser ${APPLICANT_NOTES_MAX_LENGTH} caractères`,
        },
        { status: 400 }
      );
    }
    const normalized = normalizeApplicantNotes(updates.applicantNotes);
    updates.applicantNotes = normalized ?? FieldValue.delete();
  }

  if (
    updates.voluntaryDonationCents !== undefined &&
    (!Number.isInteger(updates.voluntaryDonationCents as number) ||
      !isValidVoluntaryDonationCents(updates.voluntaryDonationCents as number))
  ) {
    return jsonNoStore({ error: "Don libre invalide (0 € ou minimum 1 €)." }, { status: 400 });
  }

  if (
    updates.paymentAmountCents !== undefined &&
    (!Number.isInteger(updates.paymentAmountCents) ||
      (updates.paymentAmountCents as number) < 0)
  ) {
    return jsonNoStore({ error: "Montant de paiement invalide" }, { status: 400 });
  }

  if (
    updates.medicalCertificateStatus !== undefined &&
    !isMedicalCertificateStatus(updates.medicalCertificateStatus)
  ) {
    return jsonNoStore({ error: "Statut de certificat médical invalide" }, { status: 400 });
  }

  if (updates.ffttLicense !== undefined) {
    if (updates.ffttLicense === null || updates.ffttLicense === "") {
      updates.ffttLicense = FieldValue.delete();
      if (updates.ffttLicenseLookup === undefined) {
        updates.ffttLicenseLookup = FieldValue.delete();
      }
    } else if (
      typeof updates.ffttLicense !== "string" ||
      !FFTT_LICENSE_RE.test(updates.ffttLicense)
    ) {
      return jsonNoStore({ error: "Numéro de licence invalide" }, { status: 400 });
    } else {
      const licenseConflicts = await findRegistrationLicenseConflicts(
        db,
        updates.ffttLicense,
        registrationId
      );
      if (licenseConflicts.blocking.length > 0) {
        const message = formatBlockingLicenseConflictMessage(licenseConflicts.blocking);
        return jsonNoStore(
          {
            error: message,
            fieldErrors: { ffttLicense: [message] },
          },
          { status: 400 }
        );
      }
    }
  }

  if (updates.ffttLicenseLookup !== undefined) {
    if (updates.ffttLicenseLookup === null) {
      updates.ffttLicenseLookup = FieldValue.delete();
    } else {
      const parsed = ffttLicenseLookupSchema.safeParse(updates.ffttLicenseLookup);
      if (!parsed.success) {
        return jsonNoStore({ error: "Données de lookup FFTT invalides" }, { status: 400 });
      }
      updates.ffttLicenseLookup = parsed.data;
    }
  }

  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
  }

  const currentData = snap.data() ?? {};
  const currentStatus = currentData.status;
  const statusPatch = currentStatus === "submitted" ? { status: "in_review" } : {};

  if (
    updates.medicalCertificateDeclaration !== undefined ||
    updates.medicalCertificateStatus !== undefined
  ) {
    const nextDeclaration =
      (updates.medicalCertificateDeclaration as string | undefined) ??
      (currentData.medicalCertificateDeclaration as string | undefined);
    const currentCertificateStatus = currentData.medicalCertificateStatus;
    const requestedCertificateStatus =
      updates.medicalCertificateStatus ?? currentCertificateStatus;
    const nextCertificateStatus = normalizeMedicalCertificateStatus(
      requestedCertificateStatus,
      nextDeclaration
    );
    updates.medicalCertificateStatus = nextCertificateStatus;
    if (nextCertificateStatus !== currentCertificateStatus) {
      updates.medicalCertificateStatusUpdatedBy = decoded.uid;
      updates.medicalCertificateStatusUpdatedAt = FieldValue.serverTimestamp();
    }
  }

  const mergedForPricing = { ...currentData, ...updates };
  const pricingPatch = await buildManagerRegistrationPricingPatch(
    mergedForPricing,
    currentData
  );

  if (updates.paymentAids !== undefined) {
    await ensureRegistrationConfigSeeded();
    const config = await getActiveRegistrationConfig();
    const aidsUpdate = resolveManagerPaymentAidsUpdate(
      mergedForPricing,
      currentData,
      updates.paymentAids,
      config
    );
    if (!aidsUpdate.ok) {
      return jsonNoStore({ error: aidsUpdate.error }, { status: 400 });
    }
    Object.assign(updates, aidsUpdate.patch);
  }

  await docRef.set(
    {
      ...updates,
      ...pricingPatch,
      ...statusPatch,
      reviewedBy: decoded.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, decoded.uid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: { fields: Object.keys(updates) },
    success: true,
  });

  return jsonNoStore({ success: true }, { status: 200 });
}

export async function handleManagerRegistrationPatch(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return jsonNoStore({ error: "Paramètre 'id' requis" }, { status: 400 });
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
  }

  const { getFirestoreAdmin } = await import("@/lib/firebase-admin");
  const db = getFirestoreAdmin();

  try {
    return await patchManagerRegistration(req, id, sessionCookie, db);
  } catch (error) {
    console.error("[api/club/registration PATCH]", error);
    return jsonNoStore({ error: "Impossible de mettre à jour le dossier" }, { status: 500 });
  }
}
