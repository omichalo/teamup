export const runtime = "nodejs";

import { checkRateLimit } from "@/lib/auth/rate-limit";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { requireAuthenticatedUser } from "@/lib/camps/api-auth";
import { searchClubMembersForCamp } from "@/lib/camps/search-club-members";

/** GET /api/club/camps/members/search?q= — recherche adhérent pour inscription stage */
export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return jsonNoStore({ members: [] });
  }

  const rate = checkRateLimit(`camp-member-search:${auth.session.uid}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return jsonNoStore({ error: "Trop de recherches" }, { status: 429 });
  }

  try {
    const members = await searchClubMembersForCamp(auth.session.db, query);
    return jsonNoStore({ members });
  } catch (error) {
    console.error("[api/club/camps/members/search GET]", error);
    return jsonNoStore({ error: "Impossible de chercher un adhérent" }, { status: 500 });
  }
}
