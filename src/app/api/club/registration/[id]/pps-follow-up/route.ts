export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import { applyPpsFollowUpEvent } from "@/lib/club-registration/apply-pps-follow-up-event";
import { isPpsFollowUpEventType } from "@/lib/club-registration/pps-follow-up";

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
    if (!body || !isPpsFollowUpEventType(body.type)) {
      return jsonNoStore({ error: "Type d’événement PPS invalide" }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const result = await applyPpsFollowUpEvent(db, id, auth.uid, {
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
        action: "pps_follow_up",
        eventType: body.type,
        ppsFollowUpStatus: result.state.status,
      },
      success: true,
    });

    return jsonNoStore({ ppsFollowUp: result.state }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/pps-follow-up POST]", error);
    return jsonNoStore(
      { error: "Impossible d’enregistrer le suivi PPS" },
      { status: 500 }
    );
  }
}
