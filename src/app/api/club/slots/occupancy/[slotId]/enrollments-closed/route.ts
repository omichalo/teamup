export const runtime = "nodejs";

import { z } from "zod";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  invalidOriginResponse,
  requireRegistrationManager,
} from "@/lib/club-registration-config/api-auth";
import { patchSlotEnrollmentsClosed } from "@/lib/club-registration-config/store";

type RouteContext = { params: Promise<{ slotId: string }> };

const bodySchema = z.object({
  closed: z.boolean(),
});

/** PATCH /api/club/slots/occupancy/[slotId]/enrollments-closed */
export async function PATCH(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }

  const auth = await requireRegistrationManager();
  if (!auth.ok) {
    return auth.response;
  }

  const { slotId } = await context.params;
  const trimmed = slotId.trim();
  if (!trimmed) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const result = await patchSlotEnrollmentsClosed(
      trimmed,
      parsed.data.closed,
      auth.session.uid
    );
    if (result === "not_found") {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_SLOT_ENROLLMENTS_TOGGLED, auth.session.uid, {
      resource: "clubRegistrationConfig.slot",
      resourceId: trimmed,
      details: { closed: parsed.data.closed },
      success: true,
    });
    return jsonNoStore({ slotId: trimmed, enrollmentsClosed: parsed.data.closed });
  } catch (error) {
    console.error("[api/club/slots/occupancy enrollments-closed PATCH]", error);
    return jsonNoStore({ error: "Impossible de mettre à jour les adhésions du créneau" }, { status: 500 });
  }
}
