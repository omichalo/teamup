export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  requireAttendanceOperator,
} from "@/lib/attendance/api-auth";
import { attendanceMarkBodySchema } from "@/lib/attendance/schema";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { isYmd } from "@/lib/attendance/calendar";
import { isRejectedRegistration } from "@/lib/attendance/alerts";
import { displayNameFromParts } from "@/lib/attendance/roster";
import { buildAttendanceMarkId } from "@/lib/attendance/mark-id";
import {
  deleteAttendanceMark,
  getRegistrationData,
  getSlotCancellation,
  upsertAttendanceMark,
} from "@/lib/attendance/store";

function readName(data: Record<string, unknown>): string {
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";
  return displayNameFromParts(firstName, lastName);
}

/** PUT /api/club/attendance/marks — pointer présent. */
export async function PUT(req: Request) {
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
  const parsed = attendanceMarkBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }
  const body = parsed.data;
  if (!isYmd(body.date)) {
    return jsonNoStore({ error: "Date invalide" }, { status: 400 });
  }

  try {
    const config = await getActiveRegistrationConfig();
    const slot = findSlotOption(config, body.slotId, body.date);
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const cancellation = await getSlotCancellation(
      auth.session.db,
      body.date,
      body.slotId
    );
    if (cancellation) {
      return jsonNoStore(
        { error: "Séance annulée : pointage impossible" },
        { status: 409 }
      );
    }

    let displayName = "Présent";
    if (body.kind !== "guest" && body.registrationId) {
      const data = await getRegistrationData(auth.session.db, body.registrationId);
      if (!data || isRejectedRegistration(data)) {
        return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
      }
      displayName = readName(data) || body.registrationId;
    }

    const mark = await upsertAttendanceMark(auth.session.db, {
      date: body.date,
      slotId: body.slotId,
      siteId: slot.siteId,
      seasonLabel: config.meta.seasonLabel,
      kind: body.kind,
      registrationId: body.registrationId,
      leadId: body.leadId,
      displayName,
      markedByUid: auth.session.uid,
      addSlotRequested: body.addSlotRequested,
    });
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_MARKED, auth.session.uid, {
      resource: "attendanceMark",
      resourceId: mark.id,
      success: true,
    });
    return jsonNoStore({ mark });
  } catch (error) {
    console.error("[api/club/attendance/marks PUT]", error);
    return jsonNoStore({ error: "Impossible d'enregistrer la présence" }, { status: 500 });
  }
}

/** DELETE /api/club/attendance/marks?date=&slotId=&kind=&registrationId=&leadId= */
export async function DELETE(req: Request) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const parsed = attendanceMarkBodySchema.safeParse({
    date: url.searchParams.get("date"),
    slotId: url.searchParams.get("slotId"),
    kind: url.searchParams.get("kind"),
    registrationId: url.searchParams.get("registrationId") || undefined,
    leadId: url.searchParams.get("leadId") || undefined,
  });
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  const markId = buildAttendanceMarkId(parsed.data);
  if (!markId) {
    return jsonNoStore({ error: "Identifiant invalide" }, { status: 400 });
  }

  try {
    const deleted = await deleteAttendanceMark(auth.session.db, markId);
    if (!deleted) {
      return jsonNoStore({ error: "Présence introuvable" }, { status: 404 });
    }
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_UNMARKED, auth.session.uid, {
      resource: "attendanceMark",
      resourceId: markId,
      success: true,
    });
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[api/club/attendance/marks DELETE]", error);
    return jsonNoStore({ error: "Impossible de retirer la présence" }, { status: 500 });
  }
}
