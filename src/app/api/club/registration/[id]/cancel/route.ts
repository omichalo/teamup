export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { cancelClubRegistration } from "@/lib/club-registration/cancel-registration";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/**
 * POST /api/club/registration/[id]/cancel — annulation définitive d'un dossier
 * (admin / secrétariat). Corps : `{ reason, confirmationPhrase }`.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, MANAGER_ROLES)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonNoStore({ error: "Identifiant de dossier requis" }, { status: 400 });
    }

    const rate = checkRateLimit(`club-registration-cancel:${decoded.uid}`, 20, 60 * 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop d'annulations dans la période autorisée. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      reason?: unknown;
      confirmationPhrase?: unknown;
    };

    const result = await cancelClubRegistration({
      db: getFirestoreAdmin(),
      registrationId: id,
      actorUid: decoded.uid,
      reason: body.reason,
      confirmationPhrase: body.confirmationPhrase,
    });

    if (!result.ok) {
      return jsonNoStore(
        {
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        },
        { status: result.status }
      );
    }

    return jsonNoStore({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/[id]/cancel]", error);
    return jsonNoStore({ error: "Impossible d'annuler le dossier" }, { status: 500 });
  }
}
