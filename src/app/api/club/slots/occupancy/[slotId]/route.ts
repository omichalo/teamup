export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { listRegistrationsForSlot } from "@/lib/attendance/store";
import {
  buildOccupancyGroups,
  findOccupancySlot,
  mapRegistrationToOccupancyPerson,
  sortOccupancyPeople,
} from "@/lib/club-slot-occupancy/build-occupancy";
import { countEnrollmentsBySlotId } from "@/lib/club-slot-occupancy/count-enrollments";

type RouteContext = { params: Promise<{ slotId: string }> };

/** GET /api/club/slots/occupancy/[slotId] — inscrits d'un créneau. */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const { slotId } = await context.params;
  const trimmed = slotId.trim();
  if (!trimmed) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  try {
    const config = await getActiveRegistrationConfig();
    const registrations = await listRegistrationsForSlot(auth.session.db, trimmed);
    const groups = buildOccupancyGroups(config, countEnrollmentsBySlotId(registrations));
    const slot = findOccupancySlot(groups, trimmed);
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    const enrolled = sortOccupancyPeople(
      registrations.map((item) => mapRegistrationToOccupancyPerson(item.id, item.data))
    );
    return jsonNoStore({ slot, enrolled });
  } catch (error) {
    console.error("[api/club/slots/occupancy/[slotId] GET]", error);
    return jsonNoStore({ error: "Impossible de charger les inscrits du créneau" }, { status: 500 });
  }
}
