export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis } from "@/lib/attendance/calendar";
import { findSlotOption } from "@/lib/attendance/slots-for-date";
import { listMarksForSlotSeason, listRegistrationsForSlot } from "@/lib/attendance/store";
import { buildSlotStats } from "@/lib/attendance/stats";
import { isIsoWeekday, resolveSlotSchedule } from "@/lib/club-registration-config/slot-schedule";

/** GET /api/club/attendance/stats?date=&slotId= */
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
    const site = config.sites.find((item) => item.id === slot.siteId);
    const catalogSlot = site?.slots.find((item) => item.id === slotId);
    const schedule = catalogSlot ? resolveSlotSchedule(catalogSlot) : null;
    const weekday = schedule?.weekday ?? slot.weekday;
    if (!isIsoWeekday(weekday)) {
      return jsonNoStore({ error: "Créneau sans horaire structuré" }, { status: 400 });
    }
    const [registrations, marks] = await Promise.all([
      listRegistrationsForSlot(auth.session.db, slotId),
      listMarksForSlotSeason(auth.session.db, config.meta.seasonLabel, slotId),
    ]);
    const stats = buildSlotStats({
      date,
      slotId,
      weekday,
      seasonLabel: config.meta.seasonLabel,
      registrations,
      marks,
    });
    return jsonNoStore({ stats });
  } catch (error) {
    console.error("[api/club/attendance/stats GET]", error);
    return jsonNoStore({ error: "Impossible de charger les statistiques" }, { status: 500 });
  }
}
