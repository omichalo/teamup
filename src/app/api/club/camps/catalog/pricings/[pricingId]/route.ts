export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { catalogPricingPatchSchema } from "@/lib/camps/catalog-schema";
import {
  deleteCatalogPricing,
  updateCatalogPricing,
} from "@/lib/camps/catalog-store";

type RouteContext = { params: Promise<{ pricingId: string }> };

/** PATCH /api/club/camps/catalog/pricings/[pricingId] */
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { pricingId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = catalogPricingPatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const pricing = await updateCatalogPricing(
      auth.session.db,
      pricingId,
      parsed.data
    );
    if (!pricing) {
      return jsonNoStore({ error: "Grille tarifaire introuvable" }, { status: 404 });
    }
    return jsonNoStore({ pricing });
  } catch (error) {
    console.error("[api/club/camps/catalog/pricings PATCH]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE /api/club/camps/catalog/pricings/[pricingId] */
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { pricingId } = await context.params;
  try {
    const ok = await deleteCatalogPricing(auth.session.db, pricingId);
    if (!ok) {
      return jsonNoStore({ error: "Grille tarifaire introuvable" }, { status: 404 });
    }
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[api/club/camps/catalog/pricings DELETE]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
