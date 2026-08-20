export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis } from "@/lib/attendance/calendar";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { listMarksForSession, listRegistrationsForSlot } from "@/lib/attendance/store";
import { buildSessionPayload } from "@/lib/attendance/roster";

/** GET /api/club/attendance/sessions?date=&slotId= */
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
    return jsonNoStore({ session, seasonLabel: config.meta.seasonLabel });
  } catch (error) {
    console.error("[api/club/attendance/sessions GET]", error);
    return jsonNoStore({ error: "Impossible de charger la séance" }, { status: 500 });
  }
}
