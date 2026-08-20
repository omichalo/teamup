export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { requireAttendanceOperator } from "@/lib/attendance/api-auth";
import { searchMembersNotOnSlot } from "@/lib/attendance/search-members";

/** GET /api/club/attendance/members?q=&slotId= */
export async function GET(req: Request) {
  const auth = await requireAttendanceOperator();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const slotId = url.searchParams.get("slotId")?.trim() ?? "";
  if (query.length < 2) {
    return jsonNoStore({ members: [] });
  }
  if (!slotId) {
    return jsonNoStore({ error: "Créneau requis" }, { status: 400 });
  }

  const rate = checkRateLimit(`attendance-search:${auth.session.uid}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return jsonNoStore({ error: "Trop de recherches" }, { status: 429 });
  }

  try {
    const members = await searchMembersNotOnSlot(auth.session.db, query, slotId);
    return jsonNoStore({ members });
  } catch (error) {
    console.error("[api/club/attendance/members GET]", error);
    return jsonNoStore({ error: "Impossible de chercher un adhérent" }, { status: 500 });
  }
}
