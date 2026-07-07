export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { mapRegistrationDocToClient } from "@/lib/club-registration/map-registration-doc-to-client";
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
} from "@/lib/club-registration/medical-certificate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { handleManagerRegistrationPatch } from "@/lib/club-registration/patch-manager-registration";
import {
  ensureRegistrationConfigSeeded,
  getActiveRegistrationConfig,
} from "@/lib/club-registration-config/store";
import { createRegistrationWithIdempotency } from "@/lib/club-registration/create-registration-with-idempotency";
import {
  findRegistrationLicenseConflicts,
  formatBlockingLicenseConflictMessage,
} from "@/lib/club-registration/find-registration-license-conflicts";
import { buildRegistrationSubmitDocument } from "@/lib/club-registration/persist-registration-on-submit";
import { readSubmissionAttemptId } from "@/lib/club-registration/submission-attempt-id";
import { resolveRegistrationContactEmail } from "@/lib/club-registration/resolve-registration-contact-email";
import { stripSubmitterEmailFromRegistrationPayload } from "@/lib/club-registration/strip-submitter-email-from-payload";
import { notifySecretariesOfNewRegistration } from "@/lib/club-registration/dispatch-registration-notifications";
import { buildRegistrationSubmittedEmail } from "@/lib/email/registration-submitted-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import {
  formatPersonDisplayName,
} from "@/lib/shared/person-name-format";

const COLLECTION = "clubRegistrations";

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

    const registration = mapRegistrationDocToClient(snap);

    return jsonNoStore({ registration }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration GET]", error);
    return jsonNoStore({ error: "Impossible de charger le dossier" }, { status: 500 });
  }
}

/** PATCH /api/club/registration?id={registrationId} — correction d'un dossier par admin/secrétaire. */
export async function PATCH(req: Request) {
  return handleManagerRegistrationPatch(req);
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

    if (sanitizedPayload.ffttLicense) {
      const licenseConflicts = await findRegistrationLicenseConflicts(
        getFirestoreAdmin(),
        sanitizedPayload.ffttLicense
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

    const db = getFirestoreAdmin();
    const now = FieldValue.serverTimestamp();
    const submissionAttemptId = readSubmissionAttemptId(req);

    const { id: registrationId, duplicated } = await createRegistrationWithIdempotency({
      db,
      submitterUid: decoded.uid,
      attemptId: submissionAttemptId,
      identity: {
        firstName: sanitizedPayload.firstName,
        lastName: sanitizedPayload.lastName,
        birthDate: sanitizedPayload.birthDate,
      },
      documentData: stripUndefined(
        buildRegistrationSubmitDocument({
          payload: sanitizedPayload,
          config: activeConfig,
          submitterUid: decoded.uid,
          submitterAccountEmail: decoded.email ?? null,
          submitterRole: role,
          isMinor: isMinorAt(sanitizedPayload.birthDate),
          medicalCertificateStatus: initialMedicalCertificateStatus(
            sanitizedPayload.medicalCertificateDeclaration
          ),
          now,
        })
      ),
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_SUBMITTED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: registrationId,
      ...(duplicated ? { details: { duplicateSubmission: true } } : {}),
      success: true,
    });

    if (!duplicated) {
      const adherentName =
        formatPersonDisplayName(sanitizedPayload.firstName, sanitizedPayload.lastName) ||
        "adhérent";
      const appOrigin = getAppBaseUrl(req);
      const confirmationMail = buildRegistrationSubmittedEmail({
        adherentName,
        registrationId,
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
          registrationId,
          payload: sanitizedPayload,
          config: activeConfig,
          submitterAccountEmail: decoded.email ?? null,
          isMinor: isMinorAt(sanitizedPayload.birthDate),
        });
      } catch (emailError) {
        console.error("[api/club/registration POST] secretary notification email", emailError);
      }
    }

    return jsonNoStore({ success: true, id: registrationId }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration POST]", error);
    return jsonNoStore({ error: "Impossible d’enregistrer le dossier" }, { status: 500 });
  }
}
