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
import { isCampManager } from "@/lib/camps/access";
import { campCreateSchema } from "@/lib/camps/schema";
import { createCamp, listCamps } from "@/lib/camps/store";

/** GET /api/club/camps — managers : tous ; autres : stages ouverts (inscription). */
export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    const all = await listCamps(auth.session.db);
    const camps = isCampManager(auth.session.role)
      ? all
      : all.filter((camp) => camp.status === "open");
    return jsonNoStore({ camps });
  } catch (error) {
    console.error("[api/club/camps GET]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST /api/club/camps — création (manager). */
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

  const parsed = campCreateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const camp = await createCamp(auth.session.db, parsed.data, auth.session.uid);
    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_CREATED, auth.session.uid, {
      resource: "camp",
      resourceId: camp.id,
      success: true,
    });
    return jsonNoStore({ camp }, { status: 201 });
  } catch (error) {
    console.error("[api/club/camps POST]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
