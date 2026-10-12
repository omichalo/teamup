export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { catalogSiteCreateSchema } from "@/lib/camps/catalog-schema";
import { createCatalogSite, listCatalogSites } from "@/lib/camps/catalog-store";

/** GET /api/club/camps/catalog/sites */
export async function GET() {
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;
  try {
    const sites = await listCatalogSites(auth.session.db);
    return jsonNoStore({ sites });
  } catch (error) {
    console.error("[api/club/camps/catalog/sites GET]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST /api/club/camps/catalog/sites */
export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = catalogSiteCreateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const site = await createCatalogSite(auth.session.db, parsed.data);
    return jsonNoStore({ site }, { status: 201 });
  } catch (error) {
    console.error("[api/club/camps/catalog/sites POST]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
