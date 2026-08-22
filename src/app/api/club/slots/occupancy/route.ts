export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isClubRegistrationManager } from "@/lib/club-registration/registration-access";
import { buildOccupancyGroups } from "@/lib/club-slot-occupancy/build-occupancy";
import { countEnrollmentsBySlotId } from "@/lib/club-slot-occupancy/count-enrollments";
import { listAllNonRejectedRegistrations } from "@/lib/club-slot-occupancy/store";

/** GET /api/club/slots/occupancy — synthèse de remplissage de tous les créneaux. */
export async function GET() {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const config = await getActiveRegistrationConfig();
    const registrations = await listAllNonRejectedRegistrations(auth.session.db);
    const groups = buildOccupancyGroups(config, countEnrollmentsBySlotId(registrations));
    return jsonNoStore({
      seasonLabel: config.meta.seasonLabel,
      groups,
      canManageEnrollments: isClubRegistrationManager(auth.session.role),
    });
  } catch (error) {
    console.error("[api/club/slots/occupancy GET]", error);
    return jsonNoStore({ error: "Impossible de charger le remplissage des créneaux" }, { status: 500 });
  }
}
