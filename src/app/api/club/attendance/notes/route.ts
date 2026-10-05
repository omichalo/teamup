export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  requireAttendanceCancellationManager,
} from "@/lib/attendance/api-auth";
import {
  resolveCancellationTargets,
  type CancellationScope,
} from "@/lib/attendance/cancellations";
import {
  attendanceSessionNoteClearSchema,
  attendanceSessionNoteUpsertSchema,
} from "@/lib/attendance/schema";
import {
  deleteSessionNotes,
  truncateCoachMessageForAudit,
  upsertSessionNotes,
} from "@/lib/attendance/session-notes";

function resolveScope(body: {
  scope?: "slot" | "day" | "week" | undefined;
  slotId?: string | undefined;
}): CancellationScope {
  if (body.scope === "day" || body.scope === "week") {
    return body.scope;
  }
  return "slot";
}

/** PUT /api/club/attendance/notes — upsert (body vide = clear). */
export async function PUT(req: Request) {
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
  const parsed = attendanceSessionNoteUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  const body = parsed.data;
  const scope = resolveScope(body);
  const message = body.body.trim();

  try {
    const config = await getActiveRegistrationConfig();
    const targets = resolveCancellationTargets({
      config,
      date: body.date,
      scope,
      slotId: "slotId" in body ? body.slotId : undefined,
    });
    if (targets.length === 0) {
      return jsonNoStore({ error: "Aucun créneau concerné" }, { status: 404 });
    }

    if (!message) {
      const result = await deleteSessionNotes(auth.session.db, targets);
      logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SESSION_NOTE_CLEARED, auth.session.uid, {
        resource: "attendanceSessionNote",
        details: {
          date: body.date,
          scope,
          updatedCount: result.deleted,
        },
        success: true,
      });
      return jsonNoStore({ ok: true, updatedCount: result.deleted, cleared: true });
    }

    const result = await upsertSessionNotes(auth.session.db, targets, {
      body: message,
      seasonLabel: config.meta.seasonLabel,
      updatedByUid: auth.session.uid,
    });
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SESSION_NOTE_UPSERTED, auth.session.uid, {
      resource: "attendanceSessionNote",
      details: {
        date: body.date,
        scope,
        updatedCount: result.written,
        bodyPreview: truncateCoachMessageForAudit(message),
      },
      success: true,
    });
    return jsonNoStore({ ok: true, updatedCount: result.written, cleared: false });
  } catch (error) {
    console.error("[api/club/attendance/notes PUT]", error);
    return jsonNoStore({ error: "Impossible d'enregistrer le message" }, { status: 500 });
  }
}

/** DELETE /api/club/attendance/notes — effacer sur le scope. */
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
  const parsed = attendanceSessionNoteClearSchema.safeParse(json);
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
      return jsonNoStore({ error: "Aucun créneau concerné" }, { status: 404 });
    }

    const result = await deleteSessionNotes(auth.session.db, targets);
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_SESSION_NOTE_CLEARED, auth.session.uid, {
      resource: "attendanceSessionNote",
      details: {
        date: body.date,
        scope,
        updatedCount: result.deleted,
      },
      success: true,
    });
    return jsonNoStore({ ok: true, updatedCount: result.deleted });
  } catch (error) {
    console.error("[api/club/attendance/notes DELETE]", error);
    return jsonNoStore({ error: "Impossible d'effacer le message" }, { status: 500 });
  }
}
