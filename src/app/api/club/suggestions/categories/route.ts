export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import { mergeSuggestionCategoryOptions } from "@/lib/app-suggestions/categories";
import { listDistinctSuggestionCategories } from "@/lib/app-suggestions/store";

/** GET /api/club/suggestions/categories — catégories par défaut + personnalisées. */
export async function GET() {
  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  try {
    const customCategories = await listDistinctSuggestionCategories(auth.session.db);
    return jsonNoStore(
      {
        categories: mergeSuggestionCategoryOptions(customCategories),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions/categories GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger les catégories" },
      { status: 500 }
    );
  }
}
