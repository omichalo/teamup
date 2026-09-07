export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import { applyMedicalCertificateFollowUpEvent } from "@/lib/club-registration/apply-medical-certificate-follow-up-event";
import { isMedicalCertificateFollowUpEventType } from "@/lib/club-registration/medical-certificate-follow-up";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireLicenseValidationActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return jsonNoStore({ error: "Identifiant manquant" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as {
      type?: unknown;
      note?: unknown;
    } | null;
    if (!body || !isMedicalCertificateFollowUpEventType(body.type)) {
      return jsonNoStore(
        { error: "Type d’événement certificat invalide" },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const result = await applyMedicalCertificateFollowUpEvent(db, id, auth.uid, {
      type: body.type,
      note: body.note,
    });
    if (!result.ok) {
      return jsonNoStore({ error: result.error }, { status: result.status });
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: {
        action: "medical_certificate_follow_up",
        eventType: body.type,
        medicalCertificateStatus: result.state.medicalCertificateStatus,
      },
      success: true,
    });

    return jsonNoStore(
      { medicalCertificateFollowUp: result.state },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[api/club/registration/medical-certificate-follow-up POST]",
      error
    );
    return jsonNoStore(
      { error: "Impossible d’enregistrer le suivi certificat médical" },
      { status: 500 }
    );
  }
}
