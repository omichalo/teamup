export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  requireAttendanceLeadManager,
  requireAttendanceOperator,
} from "@/lib/attendance/api-auth";
import {
  ATTENDANCE_LEAD_STATUSES,
  type AttendanceLeadStatus,
} from "@/lib/attendance/constants";
import { attendanceLeadCreateSchema } from "@/lib/attendance/schema";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { createLeadWithGuestMark, getSlotCancellation, listLeads } from "@/lib/attendance/store";

function isLeadStatus(value: string | null): value is AttendanceLeadStatus {
  return Boolean(
    value && (ATTENDANCE_LEAD_STATUSES as readonly string[]).includes(value),
  );
}

/** GET /api/club/attendance/leads?status= — file de relance des essais. */
export async function GET(req: Request) {
  const auth = await requireAttendanceLeadManager();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status = isLeadStatus(statusParam) ? statusParam : undefined;

  try {
    const leads = await listLeads(auth.session.db, status);
    return jsonNoStore({ leads });
  } catch (error) {
    console.error("[api/club/attendance/leads GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger les essais" },
      { status: 500 },
    );
  }
}

/** POST /api/club/attendance/leads — essai + présence guest. */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return invalidOriginResponse();
  }
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const rate = checkRateLimit(
    `attendance-lead:${auth.session.uid}`,
    20,
    15 * 60 * 1000,
  );
  if (!rate.allowed) {
    return jsonNoStore({ error: "Trop de créations d'essai" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = attendanceLeadCreateSchema.safeParse(json);
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
        { error: "Séance annulée : pointage impossible" },
        { status: 409 }
      );
    }
    const email = parsed.data.email?.trim()
      ? parsed.data.email.trim()
      : undefined;
    const created = await createLeadWithGuestMark(auth.session.db, {
      date: parsed.data.date,
      slotId: parsed.data.slotId,
      siteId: slot.siteId,
      seasonLabel: config.meta.seasonLabel,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      email,
      createdByUid: auth.session.uid,
    });
    logAuditAction(AUDIT_ACTIONS.ATTENDANCE_LEAD_CREATED, auth.session.uid, {
      resource: "attendanceLead",
      resourceId: created.lead.id,
      success: true,
    });
    return jsonNoStore(created, { status: 201 });
  } catch (error) {
    console.error("[api/club/attendance/leads POST]", error);
    return jsonNoStore(
      { error: "Impossible d'enregistrer l'essai" },
      { status: 500 },
    );
  }
}
