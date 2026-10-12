export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { isCampManager } from "@/lib/camps/access";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireAuthenticatedUser,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { campRegistrationSubmitSchema } from "@/lib/camps/schema";
import { submitCampRegistration } from "@/lib/camps/submit-registration";
import {
  listAllCampRegistrations,
  listRegistrationsForOwner,
} from "@/lib/camps/store";

/** GET /api/club/camps/registrations?scope=mine|all|payments */
export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "mine";

  if (scope === "all" || scope === "payments") {
    const auth = await requireCampManager();
    if (!auth.ok) return auth.response;
    try {
      const registrations = await listAllCampRegistrations(auth.session.db);
      const filtered =
        scope === "payments"
          ? registrations.filter((r) => r.status !== "cancelled")
          : registrations;
      return jsonNoStore({ registrations: filtered });
    } catch (error) {
      console.error("[api/club/camps/registrations GET]", error);
      return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  try {
    const registrations = await listRegistrationsForOwner(
      auth.session.db,
      auth.session.uid
    );
    return jsonNoStore({ registrations });
  } catch (error) {
    console.error("[api/club/camps/registrations GET mine]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST /api/club/camps/registrations */
export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = campRegistrationSubmitSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.ownerUid && !isCampManager(auth.session.role)) {
    return jsonNoStore(
      { error: "Seul le secrétariat peut saisir pour un autre compte" },
      { status: 403 }
    );
  }

  try {
    const result = await submitCampRegistration({
      db: auth.session.db,
      input: parsed.data,
      actorUid: auth.session.uid,
      actorRole: auth.session.role,
    });
    if (!result.ok) {
      return jsonNoStore({ error: result.error }, { status: result.status });
    }
    logAuditAction(
      AUDIT_ACTIONS.CLUB_CAMP_REGISTRATION_SUBMITTED,
      auth.session.uid,
      {
        resource: "campRegistration",
        resourceId: result.registration.id,
        details: {
          campId: result.registration.campId,
          source: result.registration.source,
        },
        success: true,
      }
    );
    return jsonNoStore({ registration: result.registration }, { status: 201 });
  } catch (error) {
    console.error("[api/club/camps/registrations POST]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
