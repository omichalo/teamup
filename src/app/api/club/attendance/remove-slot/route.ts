export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  requireAttendanceOperator,
} from "@/lib/attendance/api-auth";
import { attendanceAddSlotSchema } from "@/lib/attendance/schema";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { isRejectedRegistration } from "@/lib/attendance/alerts";
import {
  getRegistrationData,
  getSlotCancellation,
  removeSlotFromRegistration,
} from "@/lib/attendance/store";

/** POST /api/club/attendance/remove-slot — retire le créneau du dossier (arrayRemove). */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = attendanceAddSlotSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const config = await getActiveRegistrationConfig();
    const slot = findSlotOption(config, parsed.data.slotId, parsed.data.date);
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const cancellation = await getSlotCancellation(
      auth.session.db,
      parsed.data.date,
      parsed.data.slotId
    );
    if (cancellation) {
      return jsonNoStore(
        { error: "Séance annulée : modification impossible" },
        { status: 409 }
      );
    }
    const data = await getRegistrationData(auth.session.db, parsed.data.registrationId);
    if (!data || isRejectedRegistration(data)) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }
    await removeSlotFromRegistration(auth.session.db, {
      date: parsed.data.date,
      slotId: parsed.data.slotId,
      registrationId: parsed.data.registrationId,
    });
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SLOT_REMOVED, auth.session.uid, {
      resource: "clubRegistration",
      resourceId: parsed.data.registrationId,
      details: { slotId: parsed.data.slotId },
      success: true,
    });
    return jsonNoStore({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Dossier introuvable" || message === "Dossier refusé") {
      return jsonNoStore({ error: message }, { status: 404 });
    }
    console.error("[api/club/attendance/remove-slot POST]", error);
    return jsonNoStore({ error: "Impossible de retirer du créneau" }, { status: 500 });
  }
}
