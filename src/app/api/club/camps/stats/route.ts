export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { requireCampManager } from "@/lib/camps/api-auth";
import { buildCampStatsSummary } from "@/lib/camps/stats";
import type { CampSlot } from "@/lib/camps/types";
import {
  listAllCampRegistrations,
  listCamps,
  listSlotsForCamp,
} from "@/lib/camps/store";

/** GET /api/club/camps/stats?campId= optional */
export async function GET(req: Request) {
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const campId = url.searchParams.get("campId");
    const registrations = await listAllCampRegistrations(auth.session.db);
    const filtered = campId
      ? registrations.filter((r) => r.campId === campId)
      : registrations;

    let slots: CampSlot[] = [];
    if (campId) {
      slots = await listSlotsForCamp(auth.session.db, campId);
    } else {
      const camps = await listCamps(auth.session.db);
      for (const camp of camps) {
        const campSlots = await listSlotsForCamp(auth.session.db, camp.id);
        slots.push(...campSlots);
      }
    }

    const summary = buildCampStatsSummary({ registrations: filtered, slots });
    return jsonNoStore({ summary });
  } catch (error) {
    console.error("[api/club/camps/stats]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
