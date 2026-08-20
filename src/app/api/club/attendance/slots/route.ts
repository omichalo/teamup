export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis, currentMinutesInParis } from "@/lib/attendance/calendar";
import { listSlotsForDate } from "@/lib/attendance/slots-for-date";

/** GET /api/club/attendance/slots?date=YYYY-MM-DD */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isYmd(dateParam) ? dateParam : todayYmdInParis();
  const nowMinutes =
    date === todayYmdInParis() ? currentMinutesInParis() : 12 * 60;

  try {
    const config = await getActiveRegistrationConfig();
    const slots = listSlotsForDate(config, date, nowMinutes);
    return jsonNoStore({ date, slots, seasonLabel: config.meta.seasonLabel });
  } catch (error) {
    console.error("[api/club/attendance/slots GET]", error);
    return jsonNoStore({ error: "Impossible de charger les créneaux" }, { status: 500 });
  }
}
