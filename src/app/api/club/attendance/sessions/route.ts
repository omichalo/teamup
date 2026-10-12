export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis } from "@/lib/attendance/calendar";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import {
  getSlotCancellation,
  listMarksForSession,
  listRegistrationsForSlot,
} from "@/lib/attendance/store";
import { getSessionNote } from "@/lib/attendance/session-notes";
import { buildSessionPayload } from "@/lib/attendance/roster";
import { buildCampAttendanceSession } from "@/lib/attendance/camp-session";

/** GET /api/club/attendance/sessions?date=&slotId=&source= */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const slotId = url.searchParams.get("slotId")?.trim() ?? "";
  const source = url.searchParams.get("source")?.trim() ?? "training";
  const date = dateParam && isYmd(dateParam) ? dateParam : todayYmdInParis();
  if (!slotId) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  try {
    if (source === "camp") {
      const session = await buildCampAttendanceSession({
        db: auth.session.db,
        date,
        slotId,
      });
      if (!session) {
        return jsonNoStore({ error: "Créneau stage introuvable" }, { status: 404 });
      }
      return jsonNoStore({ session, seasonLabel: null, source: "camp" });
    }

    const config = await getActiveRegistrationConfig();
    const cancellation = await getSlotCancellation(auth.session.db, date, slotId);
    const cancelled = cancellation !== null;
    const slot = findSlotOption(config, slotId, date, cancelled);
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const [registrations, marks, note] = await Promise.all([
      listRegistrationsForSlot(auth.session.db, slotId),
      listMarksForSession(auth.session.db, date, slotId),
      getSessionNote(auth.session.db, date, slotId),
    ]);
    const session = buildSessionPayload({
      date,
      slot,
      cancelled,
      coachMessage: note?.body ?? null,
      registrations,
      marks,
    });
    return jsonNoStore({ session, seasonLabel: config.meta.seasonLabel });
  } catch (error) {
    console.error("[api/club/attendance/sessions GET]", error);
    return jsonNoStore({ error: "Impossible de charger la séance" }, { status: 500 });
  }
}
