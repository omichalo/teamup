export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireUnregisteredPlayFollowUpActor } from "@/lib/championship/api-auth";
import { listUnregisteredPlayFollowUps } from "@/lib/championship/list-unregistered-play";

export async function GET() {
  try {
    const auth = await requireUnregisteredPlayFollowUpActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }
    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const items = await listUnregisteredPlayFollowUps(db, seasonLabel);
    return jsonNoStore({ seasonLabel, items });
  } catch (error) {
    console.error("[api/club/championship/unregistered-play GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger le suivi hors inscription" },
      { status: 500 }
    );
  }
}
