export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import {
  buildRegistrationCertificatePdf,
  buildRegistrationCertificateViewModel,
  isRegistrationCertificateAvailable,
} from "@/lib/club-registration/registration-certificate";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/registration-certificate
 * Attestation d'inscription (document informatif, sans n° de pièce).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    if (!isRegistrationCertificateAvailable(data)) {
      return jsonNoStore(
        { error: "Aucune attestation d'inscription disponible pour ce dossier." },
        { status: 404 }
      );
    }

    const viewModel = buildRegistrationCertificateViewModel(id, data);
    if (!viewModel) {
      return jsonNoStore(
        { error: "Impossible de constituer l'attestation d'inscription." },
        { status: 404 }
      );
    }

    const pdf = await buildRegistrationCertificatePdf(viewModel);
    const fileName = `attestation-inscription-${id}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[api/club/registration/registration-certificate]", error);
    return jsonNoStore(
      { error: "Impossible de générer l'attestation d'inscription" },
      { status: 500 }
    );
  }
}
