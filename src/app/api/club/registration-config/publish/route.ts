export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  getDraftRegistrationConfig,
  publishRegistrationConfig,
} from "@/lib/club-registration-config/store";
import { validateRegistrationConfigForPublish } from "@/lib/club-registration-config/validate-config";
import {
  invalidOriginResponse,
  requireRegistrationManager,
} from "@/lib/club-registration-config/api-auth";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return invalidOriginResponse();

  const auth = await requireRegistrationManager();
  if (!auth.ok) return auth.response;

  try {
    const config = await getDraftRegistrationConfig();
    const issues = validateRegistrationConfigForPublish(config);
    if (issues.length > 0) {
      return jsonNoStore(
        {
          error: "Le brouillon ne peut pas être publié",
          details: issues.map((i) => `${i.path} : ${i.message}`),
        },
        { status: 400 }
      );
    }

    await publishRegistrationConfig(config, auth.session.uid);

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_CONFIG_PUBLISHED, auth.session.uid, {
      resource: "clubRegistrationConfig",
      resourceId: "active",
      details: { catalogVersion: config.meta.catalogVersion },
      success: true,
    });

    return jsonNoStore({
      success: true,
      catalogVersion: config.meta.catalogVersion,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[registration-config/publish] POST error", error);
    return jsonNoStore(
      { error: "Erreur lors de la publication" },
      { status: 500 }
    );
  }
}
