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
import { campSlotsBulkCreateSchema } from "@/lib/camps/schema";
import { createSlots, getCamp, listSlotsForCamp } from "@/lib/camps/store";

type RouteContext = { params: Promise<{ campId: string }> };

/** GET /api/club/camps/[campId]/slots */
export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { campId } = await context.params;
  try {
    const camp = await getCamp(auth.session.db, campId);
    if (!camp) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }
    const slots = await listSlotsForCamp(auth.session.db, campId);
    return jsonNoStore({ slots });
  } catch (error) {
    console.error("[api/club/camps/slots GET]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST /api/club/camps/[campId]/slots — bulk create */
export async function POST(req: NextRequest, context: RouteContext) {
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

  const parsed = campSlotsBulkCreateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const camp = await getCamp(auth.session.db, campId);
    if (!camp) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }
    for (const slot of parsed.data.slots) {
      if (slot.endMinutes <= slot.startMinutes) {
        return jsonNoStore(
          { error: "Chaque créneau doit avoir une fin après le début" },
          { status: 400 }
        );
      }
    }
    const slots = await createSlots(
      auth.session.db,
      campId,
      parsed.data.slots.map((slot) => ({
        ...slot,
        capacity: slot.capacity ?? null,
      }))
    );
    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_SLOTS_CREATED, auth.session.uid, {
      resource: "camp",
      resourceId: campId,
      details: { count: slots.length },
      success: true,
    });
    return jsonNoStore({ slots }, { status: 201 });
  } catch (error) {
    console.error("[api/club/camps/slots POST]", error);
    return jsonNoStore({ error: "Erreur serveur" }, { status: 500 });
  }
}
