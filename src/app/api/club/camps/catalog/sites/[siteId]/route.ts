export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { catalogSitePatchSchema } from "@/lib/camps/catalog-schema";
import { deleteCatalogSite, updateCatalogSite } from "@/lib/camps/catalog-store";

type RouteContext = { params: Promise<{ siteId: string }> };

/** PATCH /api/club/camps/catalog/sites/[siteId] */
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { siteId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = catalogSitePatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const site = await updateCatalogSite(auth.session.db, siteId, parsed.data);
    if (!site) {
      return jsonNoStore({ error: "Site introuvable" }, { status: 404 });
    }
    return jsonNoStore({ site });
  } catch (error) {
    console.error("[api/club/camps/catalog/sites PATCH]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE /api/club/camps/catalog/sites/[siteId] */
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { siteId } = await context.params;
  try {
    const ok = await deleteCatalogSite(auth.session.db, siteId);
    if (!ok) {
      return jsonNoStore({ error: "Site introuvable" }, { status: 404 });
    }
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[api/club/camps/catalog/sites DELETE]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
