export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import { canCommentOnSuggestions } from "@/lib/app-suggestions/access";
import { suggestionCommentCreateSchema } from "@/lib/app-suggestions/schema";
import {
  addSuggestionComment,
  getSuggestionDetail,
} from "@/lib/app-suggestions/store";
import { notifyAuthorOfNewComment } from "@/lib/app-suggestions/dispatch-suggestion-notifications";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/club/suggestions/[id]/comments — ajouter un commentaire. */
export async function POST(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  if (!canCommentOnSuggestions(auth.session.role)) {
    return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await context.params;

  const rateLimitResult = checkRateLimit(
    `app-suggestion-comment:${auth.session.uid}`,
    30,
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

  const parsed = suggestionCommentCreateSchema.safeParse(body);
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
    const commentId = await addSuggestionComment(
      auth.session.db,
      id,
      parsed.data,
      {
        uid: auth.session.uid,
        displayName: auth.session.displayName,
      }
    );

    if (!commentId) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    const suggestion = await getSuggestionDetail(auth.session.db, id);

    if (suggestion) {
      void notifyAuthorOfNewComment({
        req,
        submitterUid: suggestion.submitterUid,
        authorUid: auth.session.uid,
        title: suggestion.title,
        suggestionId: id,
        authorDisplayName: auth.session.displayName,
        commentBody: parsed.data.body,
        commentBodyFormat: "html",
      });
    }

    logAuditAction(
      AUDIT_ACTIONS.APP_SUGGESTION_COMMENT_ADDED,
      auth.session.uid,
      {
        resource: "appSuggestion",
        resourceId: id,
        details: { commentId },
        success: true,
      }
    );

    return jsonNoStore({ suggestion }, { status: 201 });
  } catch (error) {
    console.error("[api/club/suggestions/[id]/comments POST]", error);
    return jsonNoStore(
      { error: "Impossible d'ajouter le commentaire" },
      { status: 500 }
    );
  }
}
