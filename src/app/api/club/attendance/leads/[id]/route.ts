export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  invalidOriginResponse,
  requireAttendanceLeadManager,
} from "@/lib/attendance/api-auth";
import { attendanceLeadPatchSchema } from "@/lib/attendance/schema";
import { patchLeadStatus } from "@/lib/attendance/store";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/club/attendance/leads/[id] — statut de relance. */
export async function PATCH(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceLeadManager();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = attendanceLeadPatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const lead = await patchLeadStatus(auth.session.db, id, parsed.data.status);
    if (!lead) {
      return jsonNoStore({ error: "Essai introuvable" }, { status: 404 });
    }
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_LEAD_UPDATED, auth.session.uid, {
      resource: "attendanceLead",
      resourceId: id,
      details: { status: parsed.data.status },
      success: true,
    });
    return jsonNoStore({ lead });
  } catch (error) {
    console.error("[api/club/attendance/leads PATCH]", error);
    return jsonNoStore({ error: "Impossible de mettre à jour l'essai" }, { status: 500 });
  }
}
