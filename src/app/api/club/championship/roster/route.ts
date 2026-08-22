export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  requireChampionshipRecalculateActor,
  requireChampionshipRosterActor,
} from "@/lib/championship/api-auth";
import { backfillPlayerClubProfilesFromPlayers } from "@/lib/championship/backfill-profiles";
import { listChampionshipRosterViews } from "@/lib/championship/list-roster-views";
import { seedChampionshipRosterForSeason } from "@/lib/championship/seed-season";

export async function GET() {
  try {
    const auth = await requireChampionshipRosterActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }
    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const roster = await listChampionshipRosterViews(db, seasonLabel);
    return jsonNoStore({ seasonLabel, roster });
  } catch (error) {
    console.error("[api/club/championship/roster GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger l'effectif championnat" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }
    const auth = await requireChampionshipRecalculateActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }
    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const [seed, profiles] = await Promise.all([
      seedChampionshipRosterForSeason(db, seasonLabel),
      backfillPlayerClubProfilesFromPlayers(db),
    ]);
    logAuditAction(AUDIT_ACTIONS.CHAMPIONSHIP_ROSTER_RECALCULATED, auth.uid, {
      resource: "championshipRoster",
      details: { seasonLabel, ...seed, profilesCopied: profiles.copied },
      success: true,
    });
    return jsonNoStore({ seasonLabel, ...seed, profilesCopied: profiles.copied });
  } catch (error) {
    console.error("[api/club/championship/roster POST]", error);
    return jsonNoStore(
      { error: "Impossible de recalculer l'effectif championnat" },
      { status: 500 }
    );
  }
}
