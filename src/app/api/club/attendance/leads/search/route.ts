export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { isYmd } from "@/lib/attendance/calendar";
import {
  listRecentLeadsForSlot,
  searchReusableLeads,
} from "@/lib/attendance/search-leads";

/**
 * GET /api/club/attendance/leads/search?date=&slotId=&q=
 * - sans q (ou q < 2) : essais déjà venus sur ce créneau
 * - avec q : recherche nom / téléphone parmi les essais réutilisables
 * Rôles : opérateurs présence (coach inclus).
 */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() ?? "";
  const slotId = url.searchParams.get("slotId")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!isYmd(date)) {
    return jsonNoStore({ error: "Date invalide" }, { status: 400 });
  }
  if (!slotId) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  const rate = checkRateLimit(
    `attendance-lead-search:${auth.session.uid}`,
    40,
    60 * 1000
  );
  if (!rate.allowed) {
    return jsonNoStore({ error: "Trop de recherches" }, { status: 429 });
  }

  try {
    const leads =
      query.length >= 2
        ? await searchReusableLeads(auth.session.db, { query, date, slotId })
        : await listRecentLeadsForSlot(auth.session.db, { date, slotId });
    return jsonNoStore({ leads, mode: query.length >= 2 ? "search" : "recent" });
  } catch (error) {
    console.error("[api/club/attendance/leads/search GET]", error);
    return jsonNoStore(
      { error: "Impossible de chercher un essai" },
      { status: 500 }
    );
  }
}
