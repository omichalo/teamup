export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  requireAttendanceCancellationManager,
} from "@/lib/attendance/api-auth";
import { attendanceCancellationBodySchema } from "@/lib/attendance/schema";
import {
  cancelledKeySet,
  filterActiveTargets,
  filterCancelledTargets,
  resolveCancellationTargets,
  type CancellationScope,
} from "@/lib/attendance/cancellations";
import { isoWeekDates } from "@/lib/attendance/calendar";
import {
  deleteSlotCancellations,
  listCancellationsForDates,
  upsertSlotCancellations,
} from "@/lib/attendance/store";

function resolveScope(body: {
  scope?: "day" | "week" | undefined;
  slotId?: string | undefined;
}): CancellationScope {
  if (body.scope === "day" || body.scope === "week") {
    return body.scope;
  }
  return "slot";
}

async function loadWeekCancelledKeys(
  db: Parameters<typeof listCancellationsForDates>[0],
  date: string
) {
  const weekDates = isoWeekDates(date);
  const cancellations = await listCancellationsForDates(db, weekDates);
  return cancelledKeySet(cancellations);
}

/** POST /api/club/attendance/cancellations — annuler occurrence(s). */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceCancellationManager();
  if (!auth.ok) {
    return auth.response;
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = attendanceCancellationBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  const body = parsed.data;
  const scope = resolveScope(body);

  try {
    const config = await getActiveRegistrationConfig();
    const targets = resolveCancellationTargets({
      config,
      date: body.date,
      scope,
      slotId: "slotId" in body ? body.slotId : undefined,
    });
    if (targets.length === 0) {
      return jsonNoStore({ error: "Aucun créneau à annuler" }, { status: 404 });
    }

    const cancelledKeys = await loadWeekCancelledKeys(auth.session.db, body.date);
    const toWrite = filterActiveTargets(targets, cancelledKeys);
    const result = await upsertSlotCancellations(
      auth.session.db,
      toWrite.map((target) => ({
        ...target,
        seasonLabel: config.meta.seasonLabel,
        cancelledByUid: auth.session.uid,
      }))
    );

    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SLOT_CANCELLED, auth.session.uid, {
      resource: "attendanceSlotCancellation",
      resourceId: result.ids[0] ?? body.date,
      details: {
        date: body.date,
        scope,
        slotId: "slotId" in body ? body.slotId : undefined,
        count: result.written,
      },
      success: true,
    });

    return jsonNoStore({
      ok: true,
      count: result.written,
      ids: result.ids,
      scope,
      date: body.date,
    });
  } catch (error) {
    console.error("[api/club/attendance/cancellations POST]", error);
    return jsonNoStore({ error: "Impossible d'annuler les créneaux" }, { status: 500 });
  }
}

/** DELETE /api/club/attendance/cancellations — restaurer occurrence(s). */
export async function DELETE(req: Request) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceCancellationManager();
  if (!auth.ok) {
    return auth.response;
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = attendanceCancellationBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  const body = parsed.data;
  const scope = resolveScope(body);

  try {
    const config = await getActiveRegistrationConfig();
    const targets = resolveCancellationTargets({
      config,
      date: body.date,
      scope,
      slotId: "slotId" in body ? body.slotId : undefined,
    });
    if (targets.length === 0) {
      return jsonNoStore({ error: "Aucun créneau à restaurer" }, { status: 404 });
    }

    const cancelledKeys = await loadWeekCancelledKeys(auth.session.db, body.date);
    const toDelete = filterCancelledTargets(targets, cancelledKeys);
    const result = await deleteSlotCancellations(auth.session.db, toDelete);

    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SLOT_RESTORED, auth.session.uid, {
      resource: "attendanceSlotCancellation",
      resourceId: result.ids[0] ?? body.date,
      details: {
        date: body.date,
        scope,
        slotId: "slotId" in body ? body.slotId : undefined,
        count: result.deleted,
      },
      success: true,
    });

    return jsonNoStore({
      ok: true,
      count: result.deleted,
      ids: result.ids,
      scope,
      date: body.date,
    });
  } catch (error) {
    console.error("[api/club/attendance/cancellations DELETE]", error);
    return jsonNoStore({ error: "Impossible de restaurer les créneaux" }, { status: 500 });
  }
}
