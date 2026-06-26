export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { normalizeReductionReferenceCodes } from "@/lib/club-registration/reduction-reference-codes";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration, isClubRegistrationManager } from "@/lib/club-registration/registration-access";
import { FieldValue } from "firebase-admin/firestore";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { buildRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { isMinorAt } from "@/lib/club-registration/age";
import {
  initialMedicalCertificateStatus,
  isMedicalCertificateStatus,
  normalizeMedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { buildPricingContextFromRecord } from "@/lib/pricing/from-registration-record";
import {
  getActiveRegistrationConfig,
  ensureRegistrationConfigSeeded,
} from "@/lib/club-registration-config/store";
import { calculateQuoteWithConfig } from "@/lib/club-registration-config/pricing-resolve";
import {
  APPLICANT_NOTES_MAX_LENGTH,
  isApplicantNotesTooLong,
  normalizeApplicantNotes,
} from "@/lib/club-registration/applicant-notes";
import { buildRegistrationSubmitDocument } from "@/lib/club-registration/persist-registration-on-submit";
import { resolveRegistrationContactEmail } from "@/lib/club-registration/resolve-registration-contact-email";
import { stripSubmitterEmailFromRegistrationPayload } from "@/lib/club-registration/strip-submitter-email-from-payload";
import { notifySecretariesOfNewRegistration } from "@/lib/club-registration/dispatch-registration-notifications";
import { buildRegistrationSubmittedEmail } from "@/lib/email/registration-submitted-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import {
  MANAGER_EDITABLE_FIELDS,
  REGISTRATION_CLIENT_FIELDS,
} from "@/lib/club-registration/registration-api-fields";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

/** GET /api/club/registration?id={registrationId} — lecture d'un dossier (owner ou admin). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonNoStore({ error: "Paramètre 'id' requis" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }
    const data = snap.data();
    if (!data) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;
    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const registration: Record<string, unknown> = { id: snap.id };
    for (const key of REGISTRATION_CLIENT_FIELDS) {
      if (data[key] !== undefined) {
        registration[key] = data[key];
      }
    }
    registration.reductionReferenceCodes = normalizeReductionReferenceCodes(
      registration.reductionReferenceCodes as Record<string, string> | undefined,
      typeof data.passSportCode === "string" ? data.passSportCode : undefined
    );
    delete registration.passSportCode;
    registration.medicalCertificateStatus = normalizeMedicalCertificateStatus(
      data.medicalCertificateStatus,
      data.medicalCertificateDeclaration
    );
    registration.submittedAt = data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
    registration.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
    registration.medicalCertificateStatusUpdatedAt =
      data.medicalCertificateStatusUpdatedAt?.toDate?.()?.toISOString?.() ?? null;
    registration.paymentRequestedAt =
      data.paymentRequestedAt?.toDate?.()?.toISOString?.() ?? null;
    registration.paidAt = data.paidAt?.toDate?.()?.toISOString?.() ?? null;
    registration.pricingQuoteComputedAt =
      data.pricingQuoteComputedAt?.toDate?.()?.toISOString?.() ?? null;

    return jsonNoStore({ registration }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration GET]", error);
    return jsonNoStore({ error: "Impossible de charger le dossier" }, { status: 500 });
  }
}

/** PATCH /api/club/registration?id={registrationId} — correction d'un dossier par admin/secrétaire. */
export async function PATCH(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonNoStore({ error: "Paramètre 'id' requis" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

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
      if (normalized) {
        updates.applicantNotes = normalized;
      } else {
        updates.applicantNotes = FieldValue.delete();
      }
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
      return jsonNoStore(
        { error: "Statut de certificat médical invalide" },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }
    const currentData = snap.data() ?? {};
    const currentStatus = currentData.status;
    const statusPatch =
      currentStatus === "submitted" ? { status: "in_review" } : {};

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
    const pricingCtx = buildPricingContextFromRecord(mergedForPricing);
    const pricingPatch: Record<string, unknown> = {};
    if (pricingCtx) {
      await ensureRegistrationConfigSeeded();
      const config = await getActiveRegistrationConfig();
      const quote = calculateQuoteWithConfig(pricingCtx, config);
      pricingPatch.pricingQuote = quote;
      pricingPatch.pricingQuoteStatus = "proposed";
      pricingPatch.pricingQuoteComputedAt = FieldValue.serverTimestamp();
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
      resourceId: id,
      details: { fields: Object.keys(updates) },
      success: true,
    });

    return jsonNoStore({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration PATCH]", error);
    return jsonNoStore({ error: "Impossible de mettre à jour le dossier" }, { status: 500 });
  }
}

/**
 * POST /api/club/registration — création d'un nouveau dossier (auto-id Firestore).
 *
 * Auth requise (cookie de session, email vérifié). Le rôle minimum accepté est
 * `PLAYER` car un visiteur qui s'inscrit pour lui-même ou pour un mineur passe
 * forcément par un compte dont le rôle par défaut est `PLAYER`. Les `COACH` et
 * `ADMIN` sont également autorisés (ex. inscription par un encadrant).
 */
export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (
      !hasAnyRole(role, [
        USER_ROLES.PLAYER,
        USER_ROLES.SECRETARY,
        USER_ROLES.COACH,
        USER_ROLES.ADMIN,
      ])
    ) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const rate = checkRateLimit(`club-registration:${decoded.uid}`, 8, 60 * 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop de soumissions dans la période autorisée. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const json = (await req.json()) ?? {};
    await ensureRegistrationConfigSeeded();
    const activeConfig = await getActiveRegistrationConfig();
    const parsed = buildRegistrationPayloadSchema(activeConfig).safeParse(json);

    if (!parsed.success) {
      const first = parsed.error.flatten();
      return jsonNoStore(
        { error: "Données invalides", fieldErrors: first.fieldErrors },
        { status: 400 }
      );
    }

    const payload = isClubRegistrationManager(role)
      ? stripSubmitterEmailFromRegistrationPayload(parsed.data, decoded.email)
      : parsed.data;

    const payloadCheck = buildRegistrationPayloadSchema(activeConfig).safeParse(payload);
    if (!payloadCheck.success) {
      const first = payloadCheck.error.flatten();
      return jsonNoStore(
        { error: "Données invalides", fieldErrors: first.fieldErrors },
        { status: 400 }
      );
    }

    const sanitizedPayload = payloadCheck.data;
    const db = getFirestoreAdmin();
    const now = FieldValue.serverTimestamp();

    const docRef = await db.collection(COLLECTION).add(
      stripUndefined(
        buildRegistrationSubmitDocument({
          payload: sanitizedPayload,
          config: activeConfig,
          submitterUid: decoded.uid,
          submitterAccountEmail: decoded.email ?? null,
          isMinor: isMinorAt(sanitizedPayload.birthDate),
          medicalCertificateStatus: initialMedicalCertificateStatus(
            sanitizedPayload.medicalCertificateDeclaration
          ),
          now,
        })
      )
    );

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_SUBMITTED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: docRef.id,
      success: true,
    });

    const adherentName =
      `${sanitizedPayload.firstName ?? ""} ${sanitizedPayload.lastName ?? ""}`.trim() ||
      "adhérent";
    const appOrigin = getAppBaseUrl(req);
    const confirmationMail = buildRegistrationSubmittedEmail({
      adherentName,
      registrationId: docRef.id,
      appOrigin,
    });

    const confirmationRecipients: string[] = [];
    if (isClubRegistrationManager(role)) {
      const contactEmail = resolveRegistrationContactEmail({
        adherentEmail: sanitizedPayload.adherentEmail,
        representatives: sanitizedPayload.representatives,
      });
      if (contactEmail) {
        confirmationRecipients.push(contactEmail);
      }
    } else {
      const submitterEmail = decoded.email?.trim();
      if (submitterEmail) {
        confirmationRecipients.push(submitterEmail);
      }
    }

    for (const to of confirmationRecipients) {
      try {
        await sendMail({
          to,
          subject: `Demande d'adhésion reçue — ${adherentName}`,
          html: confirmationMail.html,
          text: confirmationMail.text,
          attachments: [getSqyPingLogoAttachment()],
        });
      } catch (emailError) {
        console.error("[api/club/registration POST] confirmation email", emailError);
      }
    }

    try {
      await notifySecretariesOfNewRegistration({
        db,
        req,
        registrationId: docRef.id,
        payload: sanitizedPayload,
        config: activeConfig,
        submitterAccountEmail: decoded.email ?? null,
        isMinor: isMinorAt(sanitizedPayload.birthDate),
      });
    } catch (emailError) {
      console.error("[api/club/registration POST] secretary notification email", emailError);
    }

    return jsonNoStore({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration POST]", error);
    return jsonNoStore({ error: "Impossible d’enregistrer le dossier" }, { status: 500 });
  }
}
