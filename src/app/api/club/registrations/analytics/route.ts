export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { getEnabledSections } from "@/lib/club-registration-config/helpers";
import { requireRegistrationAnalyticsAccess } from "@/lib/club-registration/analytics/api-auth";
import { listRegistrationsForAnalytics } from "@/lib/club-registration/analytics/list-for-analytics";
import { logAuditAction } from "@/lib/auth/audit-logger";

/** GET /api/club/registrations/analytics — données agrégables pour le tableau de bord adhérents. */
export async function GET() {
  const auth = await requireRegistrationAnalyticsAccess();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const sectionLabels = Object.fromEntries(
      getEnabledSections(config).map((section) => [section.id, section.label])
    );

    const { records, seasonLabelBackfillUpdated } = await listRegistrationsForAnalytics(
      auth.session.db,
      seasonLabel
    );

    if (seasonLabelBackfillUpdated > 0) {
      logAuditAction("club_registration.season_label_backfill", auth.session.uid, {
        resource: "clubRegistration",
        details: { seasonLabel, updatedCount: seasonLabelBackfillUpdated },
        success: true,
      });
    }

    return jsonNoStore({
      seasonLabel,
      sectionLabels,
      records,
    });
  } catch (error) {
    console.error("[api/club/registrations/analytics GET]", error);
    return jsonNoStore({ error: "Impossible de charger les statistiques" }, { status: 500 });
  }
}
