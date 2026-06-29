export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { isRegistrationDeleteConfirmationValid } from "@/lib/club-registration/validate-registration-delete-confirmation";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/**
 * DELETE /api/club/registration/[id] — suppression définitive d'un dossier (admin / secrétariat).
 *
 * Corps JSON : `{ confirmationPhrase: string }` — ex. `SUPPRIMER Prénom NOM`.
 */
export async function DELETE(
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

    const rate = checkRateLimit(`club-registration-delete:${decoded.uid}`, 20, 60 * 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop de suppressions dans la période autorisée. Réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      confirmationPhrase?: unknown;
    };

    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const identity = { firstName, lastName };

    if (!isRegistrationDeleteConfirmationValid(identity, body.confirmationPhrase)) {
      return jsonNoStore(
        {
          error:
            "Confirmation invalide. Saisissez la phrase affichée, par ex. SUPPRIMER Prénom NOM.",
        },
        { status: 400 }
      );
    }

    const adherentName = formatPersonDisplayName(firstName, lastName) || "adhérent";

    await docRef.delete();

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_DELETED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: {
        status: typeof data.status === "string" ? data.status : null,
        adherentName,
      },
      success: true,
    });

    return jsonNoStore({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/[id] DELETE]", error);
    return jsonNoStore({ error: "Impossible de supprimer le dossier" }, { status: 500 });
  }
}
