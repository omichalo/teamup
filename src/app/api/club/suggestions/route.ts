export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import { resolveSuggestionStatusFilter } from "@/lib/app-suggestions/status";
import {
  resolveSuggestionCategoryFilter,
  resolveSuggestionMineFilter,
} from "@/lib/app-suggestions/resolve-list-filters";
import {
  suggestionCreateSchema,
} from "@/lib/app-suggestions/schema";
import {
  createSuggestion,
  getSuggestionDetail,
  listSuggestions,
  SUGGESTIONS_PAGE_SIZE_DEFAULT,
  SUGGESTIONS_PAGE_SIZE_MAX,
} from "@/lib/app-suggestions/store";
import { notifyMaintainersOfNewSuggestion } from "@/lib/app-suggestions/dispatch-suggestion-notifications";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

/** GET /api/club/suggestions — liste des idées d'amélioration (staff hors joueurs). */
export async function GET(req: Request) {
  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const statusFilter = resolveSuggestionStatusFilter(url.searchParams.get("status"));
  const categoryFilter = resolveSuggestionCategoryFilter(
    url.searchParams.get("category")
  );
  const mineOnly = resolveSuggestionMineFilter(url.searchParams.get("mine"));
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const pageSize = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), SUGGESTIONS_PAGE_SIZE_MAX)
    : SUGGESTIONS_PAGE_SIZE_DEFAULT;
  const cursor = url.searchParams.get("cursor");

  try {
    const page = await listSuggestions(auth.session.db, {
      statusFilter,
      categoryFilter,
      mineOnly,
      ...(mineOnly ? { submitterUid: auth.session.uid } : {}),
      pageSize,
      cursor,
    });

    return jsonNoStore(
      {
        suggestions: page.suggestions,
        pageInfo: {
          hasNextPage: page.hasNextPage,
          nextCursor: page.nextCursor,
        },
        viewer: {
          isMaintainer: auth.session.isMaintainer,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger les idées" },
      { status: 500 }
    );
  }
}

/** POST /api/club/suggestions — créer une idée d'amélioration. */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const rateLimitResult = checkRateLimit(
    `app-suggestion:${auth.session.uid}`,
    10,
    60 * 60 * 1000
  );
  if (!rateLimitResult.allowed) {
    return jsonNoStore({ error: "Trop de requêtes" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = suggestionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore(
      {
        error: "Données invalides",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const id = await createSuggestion(auth.session.db, parsed.data, {
      uid: auth.session.uid,
      displayName: auth.session.displayName,
    });

    logAuditAction(AUDIT_ACTIONS.APP_SUGGESTION_CREATED, auth.session.uid, {
      resource: "appSuggestion",
      resourceId: id,
      success: true,
    });

    const created = await getSuggestionDetail(auth.session.db, id);
    if (created) {
      void notifyMaintainersOfNewSuggestion({
        db: auth.session.db,
        req,
        suggestionId: id,
        title: created.title,
        category: created.category,
        description: created.description,
        descriptionFormat: created.descriptionFormat,
        submitterUid: auth.session.uid,
        submitterDisplayName: auth.session.displayName,
      });
    }

    return jsonNoStore({ id }, { status: 201 });
  } catch (error) {
    console.error("[api/club/suggestions POST]", error);
    return jsonNoStore(
      { error: "Impossible de créer l'idée" },
      { status: 500 }
    );
  }
}
