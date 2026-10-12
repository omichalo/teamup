export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireAuthenticatedUser,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { campPatchSchema } from "@/lib/camps/schema";
import {
  deleteDraftCamp,
  getCamp,
  listSlotsForCamp,
  updateCamp,
} from "@/lib/camps/store";

type RouteContext = { params: Promise<{ campId: string }> };

/** GET /api/club/camps/[campId] */
export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const { campId } = await context.params;
  try {
    const camp = await getCamp(auth.session.db, campId);
    if (!camp) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }
    const slots = await listSlotsForCamp(auth.session.db, campId);
    return jsonNoStore({ camp, slots });
  } catch (error) {
    console.error("[api/club/camps/[campId] GET]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PATCH /api/club/camps/[campId] */
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { campId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = campPatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await getCamp(auth.session.db, campId);
    if (!existing) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }

    const nextStatus = parsed.data.status ?? existing.status;
    const nextSites =
      parsed.data.sites !== undefined ? parsed.data.sites : existing.sites;
    if (nextStatus === "open" && nextSites.length === 0) {
      return jsonNoStore(
        { error: "Ajoutez au moins un site avant d’ouvrir les inscriptions" },
        { status: 400 }
      );
    }

    // Ne jamais écrire des champs absents du body (évite d’écraser sites/pricing).
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) patch[key] = value;
    }

    const camp = await updateCamp(
      auth.session.db,
      campId,
      patch,
      auth.session.uid
    );
    if (!camp) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }
    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_UPDATED, auth.session.uid, {
      resource: "camp",
      resourceId: campId,
      success: true,
    });
    return jsonNoStore({ camp });
  } catch (error) {
    console.error("[api/club/camps/[campId] PATCH]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE /api/club/camps/[campId] — brouillon uniquement (manager). */
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { campId } = await context.params;
  try {
    const result = await deleteDraftCamp(auth.session.db, campId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
      }
      if (result.reason === "not_draft") {
        return jsonNoStore(
          { error: "Seuls les stages en brouillon peuvent être supprimés" },
          { status: 409 }
        );
      }
      return jsonNoStore(
        {
          error:
            "Suppression refusée : inscriptions actives anormales sur ce brouillon",
        },
        { status: 409 }
      );
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_DELETED, auth.session.uid, {
      resource: "camp",
      resourceId: campId,
      success: true,
    });
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[api/club/camps/[campId] DELETE]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
