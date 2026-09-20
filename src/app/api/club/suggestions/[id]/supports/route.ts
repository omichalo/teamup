export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  resolveSuggestionSession,
  toSuggestionViewer,
} from "@/lib/app-suggestions/api-auth";
import { getSuggestionDetail } from "@/lib/app-suggestions/store";
import {
  hasUserSupportedSuggestion,
  setSuggestionSupport,
} from "@/lib/app-suggestions/supports-store";
import { canViewSuggestion } from "@/lib/app-suggestions/visibility";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/club/suggestions/[id]/supports — état de soutien du viewer. */
export async function GET(_req: Request, context: RouteContext) {
  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const viewer = toSuggestionViewer(auth.session);

  try {
    const suggestion = await getSuggestionDetail(auth.session.db, id, viewer);
    if (!suggestion) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    const supported = await hasUserSupportedSuggestion(
      auth.session.db,
      id,
      auth.session.uid
    );

    return jsonNoStore(
      { supported, supportCount: suggestion.supportCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions/[id]/supports GET]", error);
    return jsonNoStore({ error: "Impossible de charger le soutien" }, { status: 500 });
  }
}

/** POST /api/club/suggestions/[id]/supports — ajouter son soutien. */
export async function POST(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const rateLimitResult = checkRateLimit(
    `app-suggestion-support:${auth.session.uid}`,
    60,
    60 * 60 * 1000
  );
  if (!rateLimitResult.allowed) {
    return jsonNoStore({ error: "Trop de requêtes" }, { status: 429 });
  }

  const { id } = await context.params;
  const viewer = toSuggestionViewer(auth.session);

  try {
    const suggestion = await getSuggestionDetail(auth.session.db, id, viewer);
    if (
      !suggestion ||
      !canViewSuggestion(viewer, {
        submitterUid: suggestion.submitterUid,
        domain: suggestion.domain,
        visibility: suggestion.visibility,
      })
    ) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    const result = await setSuggestionSupport(
      auth.session.db,
      id,
      auth.session.uid,
      true
    );
    if (!result) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    return jsonNoStore(
      { supported: true, supportCount: result.supportCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions/[id]/supports POST]", error);
    const message =
      error instanceof Error ? error.message : "Impossible d'enregistrer le soutien";
    return jsonNoStore({ error: message }, { status: 400 });
  }
}

/** DELETE /api/club/suggestions/[id]/supports — retirer son soutien. */
export async function DELETE(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const result = await setSuggestionSupport(
      auth.session.db,
      id,
      auth.session.uid,
      false
    );
    if (!result) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    return jsonNoStore(
      { supported: false, supportCount: result.supportCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions/[id]/supports DELETE]", error);
    return jsonNoStore({ error: "Impossible de retirer le soutien" }, { status: 500 });
  }
}
