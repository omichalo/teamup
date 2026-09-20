export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireUnregisteredPlayFollowUpActor } from "@/lib/championship/api-auth";
import { championshipPlayersCollection } from "@/lib/championship/store";
import { unregisteredPlayPaymentPatchSchema } from "@/lib/championship/unregistered-play-schema";
import { paymentStatusFieldForCompetition } from "@/lib/championship/unregistered-play-follow-up";

type RouteContext = { params: Promise<{ personKey: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }
    const auth = await requireUnregisteredPlayFollowUpActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { personKey: rawKey } = await context.params;
    const personKey = decodeURIComponent(rawKey).trim();
    if (!personKey) {
      return jsonNoStore({ error: "Clé personne manquante" }, { status: 400 });
    }

    const parsed = unregisteredPlayPaymentPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonNoStore({ error: "Données invalides" }, { status: 400 });
    }

    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const docRef = championshipPlayersCollection(db, seasonLabel).doc(personKey);
    const existing = await docRef.get();
    if (!existing.exists) {
      return jsonNoStore({ error: "Joueur introuvable dans l'effectif" }, { status: 404 });
    }

    const field = paymentStatusFieldForCompetition(parsed.data.competition);
    await docRef.set(
      {
        [field]: parsed.data.paymentStatus,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logAuditAction(
      AUDIT_ACTIONS.CHAMPIONSHIP_UNREGISTERED_PLAY_PAYMENT_UPDATED,
      auth.uid,
      {
        resource: "championshipUnregisteredPlay",
        resourceId: personKey,
        details: {
          seasonLabel,
          competition: parsed.data.competition,
          paymentStatus: parsed.data.paymentStatus,
        },
        success: true,
      }
    );

    return jsonNoStore({
      success: true,
      personKey,
      seasonLabel,
      competition: parsed.data.competition,
      paymentStatus: parsed.data.paymentStatus,
    });
  } catch (error) {
    console.error("[api/club/championship/unregistered-play PATCH]", error);
    return jsonNoStore(
      { error: "Impossible de mettre à jour le statut de paiement" },
      { status: 500 }
    );
  }
}
