export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis, currentMinutesInParis, isoWeekDates } from "@/lib/attendance/calendar";
import {
  applyCancellationsToSlots,
  buildWeekSummary,
  cancelledKeySet,
  listCatalogSlotsForDate,
} from "@/lib/attendance/cancellations";
import { listCancellationsForDate, listCancellationsForDates } from "@/lib/attendance/store";

/** GET /api/club/attendance/slots?date=YYYY-MM-DD */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isYmd(dateParam) ? dateParam : todayYmdInParis();
  const today = todayYmdInParis();
  const nowMinutes = date === today ? currentMinutesInParis() : 12 * 60;

  try {
    const config = await getActiveRegistrationConfig();
    const weekDates = isoWeekDates(date);
    const [dayCancellations, weekCancellations] = await Promise.all([
      listCancellationsForDate(auth.session.db, date),
      listCancellationsForDates(auth.session.db, weekDates),
    ]);
    const dayCancelledKeys = cancelledKeySet(dayCancellations);
    const weekCancelledKeys = cancelledKeySet(weekCancellations);
    const catalogSlots = listCatalogSlotsForDate(config, date, nowMinutes);
    const slots = applyCancellationsToSlots(catalogSlots, dayCancelledKeys, date);
    const week = buildWeekSummary({
      date,
      config,
      cancelledKeys: weekCancelledKeys,
      nowMinutes: 12 * 60,
    });
    return jsonNoStore({
      date,
      slots,
      week,
      seasonLabel: config.meta.seasonLabel,
    });
  } catch (error) {
    console.error("[api/club/attendance/slots GET]", error);
    return jsonNoStore({ error: "Impossible de charger les créneaux" }, { status: 500 });
  }
}
