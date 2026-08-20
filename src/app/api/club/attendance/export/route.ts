export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis } from "@/lib/attendance/calendar";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { listMarksForSession, listRegistrationsForSlot } from "@/lib/attendance/store";
import { buildSessionPayload } from "@/lib/attendance/roster";
import { buildAttendanceExportCsv, sessionToExportRows } from "@/lib/attendance/stats";

/** GET /api/club/attendance/export?date=&slotId= — CSV de la séance. */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const slotId = url.searchParams.get("slotId")?.trim() ?? "";
  const date = dateParam && isYmd(dateParam) ? dateParam : todayYmdInParis();
  if (!slotId) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  try {
    const config = await getActiveRegistrationConfig();
    const slot = findSlotOption(config, slotId, date);
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const [registrations, marks] = await Promise.all([
      listRegistrationsForSlot(auth.session.db, slotId),
      listMarksForSession(auth.session.db, date, slotId),
    ]);
    const session = buildSessionPayload({ date, slot, registrations, marks });
    const csv = buildAttendanceExportCsv(sessionToExportRows(session));
    const res = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="presences-${date}-${slotId}.csv"`,
      },
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[api/club/attendance/export GET]", error);
    return jsonNoStore({ error: "Impossible d'exporter la séance" }, { status: 500 });
  }
}
