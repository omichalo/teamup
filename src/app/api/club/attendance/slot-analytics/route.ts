export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd, todayYmdInParis, seasonBoundsYmd } from "@/lib/attendance/calendar";
import {
  listCancellationsForSlot,
  listMarksForSlotSeason,
  listRegistrationsForSlot,
} from "@/lib/attendance/store";
import { buildSlotAnalytics } from "@/lib/attendance/stats";
import { isIsoWeekday, resolveSlotSchedule } from "@/lib/club-registration-config/slot-schedule";
import type { RegistrationSiteSlot } from "@/lib/club-registration-config/types";

function findCatalogSlot(
  sites: Array<{ id: string; slots: RegistrationSiteSlot[] }>,
  slotId: string
): RegistrationSiteSlot | null {
  for (const site of sites) {
    const slot = site.slots.find((item) => item.id === slotId);
    if (slot) {
      return slot;
    }
  }
  return null;
}

/** GET /api/club/attendance/slot-analytics?slotId=&date= — KPI + série + taux par adhérent. */
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
    const catalogSlot = findCatalogSlot(config.sites, slotId);
    if (!catalogSlot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const schedule = resolveSlotSchedule(catalogSlot);
    if (!schedule || !isIsoWeekday(schedule.weekday)) {
      return jsonNoStore({ error: "Créneau sans horaire structuré" }, { status: 400 });
    }

    const bounds = seasonBoundsYmd(config.meta.seasonLabel);
    const [registrations, marks, cancellations] = await Promise.all([
      listRegistrationsForSlot(auth.session.db, slotId),
      listMarksForSlotSeason(auth.session.db, config.meta.seasonLabel, slotId),
      listCancellationsForSlot(auth.session.db, slotId, bounds.start, date),
    ]);
    const cancelledDates = new Set(cancellations.map((item) => item.date));
    const analytics = buildSlotAnalytics({
      date,
      slotId,
      weekday: schedule.weekday,
      seasonLabel: config.meta.seasonLabel,
      registrations,
      marks,
      cancelledDates,
      ...(typeof catalogSlot.capacity === "number" ? { capacity: catalogSlot.capacity } : {}),
    });
    return jsonNoStore({ analytics });
  } catch (error) {
    console.error("[api/club/attendance/slot-analytics GET]", error);
    return jsonNoStore({ error: "Impossible de charger les statistiques du créneau" }, { status: 500 });
  }
}
