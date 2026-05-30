export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { parseConfigExportFile } from "@/lib/club-registration-config/export-import";
import { saveDraftRegistrationConfig } from "@/lib/club-registration-config/store";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireRegistrationManager,
} from "@/lib/club-registration-config/api-auth";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return invalidOriginResponse();

  const auth = await requireRegistrationManager();
  if (!auth.ok) return auth.response;

  try {
    const body = await parseJsonBody(req);
    const result = parseConfigExportFile(body);
    if (!result.ok) {
      return jsonNoStore(
        { error: "Import invalide", details: result.errors },
        { status: 400 }
      );
    }

    await saveDraftRegistrationConfig(result.config, auth.session.uid);

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_CONFIG_IMPORTED, auth.session.uid, {
      resource: "clubRegistrationConfig",
      resourceId: "draft",
      details: { catalogVersion: result.config.meta.catalogVersion },
      success: true,
    });

    return jsonNoStore({
      success: true,
      catalogVersion: result.config.meta.catalogVersion,
    });
  } catch (error) {
    console.error("[registration-config/import] POST error", error);
    return jsonNoStore({ error: "Erreur lors de l'import" }, { status: 500 });
  }
}
