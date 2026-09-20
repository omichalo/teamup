export const runtime = "nodejs";

import { after } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  resolveSuggestionSession,
  toSuggestionViewer,
} from "@/lib/app-suggestions/api-auth";
import { canEditSuggestionContent } from "@/lib/app-suggestions/access";
import {
  canModerateSuggestion,
  canSeeInternalFields,
  canTriageSuggestion,
  resolveSuggestionDomain,
} from "@/lib/app-suggestions/visibility";
import { isAuthorEditableStatus } from "@/lib/app-suggestions/status";
import {
  suggestionAuthorPatchSchema,
  suggestionMaintainerPatchSchema,
  suggestionModerateSchema,
} from "@/lib/app-suggestions/schema";
import {
  getSuggestionDetail,
  patchSuggestionAsAuthor,
  patchSuggestionAsMaintainer,
} from "@/lib/app-suggestions/store";
import {
  setSuggestionCommentHidden,
  setSuggestionHidden,
} from "@/lib/app-suggestions/moderation-store";
import { notifyAuthorOfMaintainerUpdate } from "@/lib/app-suggestions/dispatch-suggestion-notifications";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/club/suggestions/[id] — détail d'une idée avec commentaires. */
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

    const domain = resolveSuggestionDomain(suggestion.domain);

    return jsonNoStore(
      {
        suggestion,
        viewer: {
          isMaintainer: auth.session.isMaintainer,
          isClubReferent: auth.session.isClubReferent,
          canEditContent: canEditSuggestionContent(
            auth.session.role,
            suggestion.submitterUid,
            auth.session.uid,
            suggestion.status,
            auth.session.isMaintainer
          ),
          canTriage: canTriageSuggestion(viewer, domain),
          canModerate: canModerateSuggestion(viewer, domain),
          canSeeInternal: canSeeInternalFields(viewer),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/suggestions/[id] GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger l'idée" },
      { status: 500 }
    );
  }
}

/** PATCH /api/club/suggestions/[id] — auteur, triage ou modération. */
export async function PATCH(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const viewer = toSuggestionViewer(auth.session);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const scope =
    typeof body === "object" && body !== null && "scope" in body
      ? (body as { scope?: string }).scope
      : undefined;

  try {
    const existing = await getSuggestionDetail(auth.session.db, id, viewer);
    if (!existing) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    const domain = resolveSuggestionDomain(existing.domain);

    if (scope === "moderate") {
      if (!canModerateSuggestion(viewer, domain)) {
        return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
      }

      const payload =
        typeof body === "object" && body !== null ? { ...body } : {};
      delete (payload as { scope?: string }).scope;

      const parsed = suggestionModerateSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonNoStore(
          {
            error: "Données invalides",
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      if (
        parsed.data.action === "hide" ||
        parsed.data.action === "unhide"
      ) {
        await setSuggestionHidden(
          auth.session.db,
          id,
          parsed.data.action === "hide",
          auth.session.uid
        );
      } else {
        if (!parsed.data.commentId) {
          return jsonNoStore(
            { error: "Identifiant de commentaire requis" },
            { status: 400 }
          );
        }
        await setSuggestionCommentHidden(
          auth.session.db,
          id,
          parsed.data.commentId,
          parsed.data.action === "hide_comment",
          auth.session.uid
        );
      }
    } else if (scope === "maintainer") {
      if (!canTriageSuggestion(viewer, domain)) {
        return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
      }

      const payload =
        typeof body === "object" && body !== null ? { ...body } : {};
      delete (payload as { scope?: string }).scope;

      const parsed = suggestionMaintainerPatchSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonNoStore(
          {
            error: "Données invalides",
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const triagePatch = { ...parsed.data };
      if (!canSeeInternalFields(viewer)) {
        delete triagePatch.githubIssueUrl;
      }

      await patchSuggestionAsMaintainer(auth.session.db, id, triagePatch, {
        uid: auth.session.uid,
        displayName: auth.session.displayName,
      });
    } else {
      if (
        !canEditSuggestionContent(
          auth.session.role,
          existing.submitterUid,
          auth.session.uid,
          existing.status,
          auth.session.isMaintainer
        )
      ) {
        return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
      }

      if (!isAuthorEditableStatus(existing.status) && !auth.session.isMaintainer) {
        return jsonNoStore(
          { error: "Cette idée n'est plus modifiable" },
          { status: 400 }
        );
      }

      const payload =
        typeof body === "object" && body !== null ? { ...body } : {};
      delete (payload as { scope?: string }).scope;

      const parsed = suggestionAuthorPatchSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonNoStore(
          {
            error: "Données invalides",
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      await patchSuggestionAsAuthor(
        auth.session.db,
        id,
        parsed.data,
        auth.session.uid
      );
    }

    const suggestion = await getSuggestionDetail(auth.session.db, id, viewer);

    if (!suggestion) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    if (scope === "maintainer") {
      after(async () => {
        await notifyAuthorOfMaintainerUpdate({
          db: auth.session.db,
          req,
          submitterUid: existing.submitterUid,
          title: suggestion.title,
          suggestionId: id,
          previousStatus: existing.status,
          newStatus: suggestion.status,
          previousMaintainerNote: existing.maintainerNote,
          newMaintainerNote: suggestion.maintainerNote,
          maintainerDisplayName: auth.session.displayName,
          maintainerUid: auth.session.uid,
        });
      });
    }

    logAuditAction(AUDIT_ACTIONS.APP_SUGGESTION_UPDATED, auth.session.uid, {
      resource: "appSuggestion",
      resourceId: id,
      details: { scope: scope ?? "author" },
      success: true,
    });

    return jsonNoStore({ suggestion }, { status: 200 });
  } catch (error) {
    console.error("[api/club/suggestions/[id] PATCH]", error);
    return jsonNoStore(
      { error: "Impossible de mettre à jour l'idée" },
      { status: 500 }
    );
  }
}
