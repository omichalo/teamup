export const runtime = "nodejs";

import { after } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  resolveSuggestionSession,
  toSuggestionViewer,
} from "@/lib/app-suggestions/api-auth";
import { canCommentOnSuggestion } from "@/lib/app-suggestions/visibility";
import { suggestionCommentCreateSchema } from "@/lib/app-suggestions/schema";
import {
  addSuggestionComment,
  getSuggestionDetail,
} from "@/lib/app-suggestions/store";
import {
  notifyAuthorOfNewComment,
  notifyMaintainersOfAuthorReply,
} from "@/lib/app-suggestions/dispatch-suggestion-notifications";
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

  const viewer = toSuggestionViewer(auth.session);
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
    const existing = await getSuggestionDetail(auth.session.db, id, viewer);
    if (!existing) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    if (
      !canCommentOnSuggestion(viewer, {
        submitterUid: existing.submitterUid,
        domain: existing.domain,
        visibility: existing.visibility,
      })
    ) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

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

    const suggestion = await getSuggestionDetail(auth.session.db, id, viewer);

    if (suggestion) {
      const notifyParams = {
        req,
        db: auth.session.db,
        submitterUid: suggestion.submitterUid,
        authorUid: auth.session.uid,
        title: suggestion.title,
        suggestionId: id,
        domain: suggestion.domain,
        authorDisplayName: auth.session.displayName,
        commentBody: parsed.data.body,
        commentBodyFormat: "html" as const,
      };
      after(async () => {
        await Promise.all([
          notifyAuthorOfNewComment(notifyParams),
          notifyMaintainersOfAuthorReply(notifyParams),
        ]);
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
