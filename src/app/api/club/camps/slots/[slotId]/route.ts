export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { campSlotPatchSchema } from "@/lib/camps/schema";
import { patchSlot } from "@/lib/camps/store";

type RouteContext = { params: Promise<{ slotId: string }> };

/** PATCH /api/club/camps/slots/[slotId] */
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { slotId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = campSlotPatchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const slot = await patchSlot(
      auth.session.db,
      slotId,
      parsed.data as Record<string, unknown>
    );
    if (!slot) {
      return jsonNoStore({ error: "Créneau introuvable" }, { status: 404 });
    }
    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_SLOT_UPDATED, auth.session.uid, {
      resource: "campSlot",
      resourceId: slotId,
      success: true,
    });
    return jsonNoStore({ slot });
  } catch (error) {
    console.error("[api/club/camps/slots PATCH]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
