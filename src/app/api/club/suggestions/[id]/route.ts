export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import {
  canEditSuggestionContent,
  canManageSuggestionTriage,
} from "@/lib/app-suggestions/access";
import { isAuthorEditableStatus } from "@/lib/app-suggestions/status";
import {
  suggestionAuthorPatchSchema,
  suggestionMaintainerPatchSchema,
} from "@/lib/app-suggestions/schema";
import {
  getSuggestionDetail,
  patchSuggestionAsAuthor,
  patchSuggestionAsMaintainer,
} from "@/lib/app-suggestions/store";
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

  try {
    const suggestion = await getSuggestionDetail(auth.session.db, id);
    if (!suggestion) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    return jsonNoStore(
      {
        suggestion,
        viewer: {
          isMaintainer: auth.session.isMaintainer,
          canEditContent: canEditSuggestionContent(
            auth.session.role,
            suggestion.submitterUid,
            auth.session.uid,
            suggestion.status,
            auth.session.isMaintainer
          ),
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

/** PATCH /api/club/suggestions/[id] — mise à jour auteur ou mainteneur. */
export async function PATCH(req: Request, context: RouteContext) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

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
    const existing = await getSuggestionDetail(auth.session.db, id);
    if (!existing) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    if (scope === "maintainer") {
      if (!canManageSuggestionTriage(auth.session.isMaintainer)) {
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

      await patchSuggestionAsMaintainer(
        auth.session.db,
        id,
        parsed.data,
        {
          uid: auth.session.uid,
          displayName: auth.session.displayName,
        }
      );
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

    const suggestion = await getSuggestionDetail(auth.session.db, id);

    if (!suggestion) {
      return jsonNoStore({ error: "Idée introuvable" }, { status: 404 });
    }

    if (scope === "maintainer") {
      void notifyAuthorOfMaintainerUpdate({
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
