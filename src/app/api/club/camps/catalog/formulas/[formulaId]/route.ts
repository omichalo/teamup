export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { catalogFormulaPatchSchema } from "@/lib/camps/catalog-schema";
import {
  deleteCatalogFormula,
  updateCatalogFormula,
} from "@/lib/camps/catalog-store";

type RouteContext = { params: Promise<{ formulaId: string }> };

/** PATCH /api/club/camps/catalog/formulas/[formulaId] */
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { formulaId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = catalogFormulaPatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const formula = await updateCatalogFormula(
      auth.session.db,
      formulaId,
      parsed.data
    );
    if (!formula) {
      return jsonNoStore({ error: "Formule introuvable" }, { status: 404 });
    }
    return jsonNoStore({ formula });
  } catch (error) {
    console.error("[api/club/camps/catalog/formulas PATCH]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE /api/club/camps/catalog/formulas/[formulaId] */
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { formulaId } = await context.params;
  try {
    const ok = await deleteCatalogFormula(auth.session.db, formulaId);
    if (!ok) {
      return jsonNoStore({ error: "Formule introuvable" }, { status: 404 });
    }
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[api/club/camps/catalog/formulas DELETE]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
