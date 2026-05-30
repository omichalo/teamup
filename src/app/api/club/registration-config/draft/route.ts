export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { registrationConfigV1Schema } from "@/lib/club-registration-config/schema";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  ensureRegistrationConfigSeeded,
  getDraftRegistrationConfig,
  getRegistrationConfigDoc,
  REGISTRATION_CONFIG_DRAFT_ID,
  REGISTRATION_CONFIG_ACTIVE_ID,
  saveDraftRegistrationConfig,
} from "@/lib/club-registration-config/store";
import { validateRegistrationConfigCrossRefs } from "@/lib/club-registration-config/validate-config";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireRegistrationManager,
} from "@/lib/club-registration-config/api-auth";

export async function GET() {
  const auth = await requireRegistrationManager();
  if (!auth.ok) return auth.response;

  try {
    await ensureRegistrationConfigSeeded();
    const config = await getDraftRegistrationConfig();
    const draftMeta = await getRegistrationConfigDoc(REGISTRATION_CONFIG_DRAFT_ID);
    const activeMeta = await getRegistrationConfigDoc(REGISTRATION_CONFIG_ACTIVE_ID);

    return jsonNoStore({
      config,
      draftUpdatedAt: draftMeta?.updatedAt ?? null,
      draftUpdatedBy: draftMeta?.updatedBy ?? null,
      activePublishedAt: activeMeta?.publishedAt ?? null,
      activeCatalogVersion: activeMeta?.config.meta.catalogVersion ?? null,
    });
  } catch (error) {
    console.error("[registration-config/draft] GET error", error);
    return jsonNoStore(
      { error: "Erreur lors de la récupération du brouillon" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) return invalidOriginResponse();

  const auth = await requireRegistrationManager();
  if (!auth.ok) return auth.response;

  try {
    const body = await parseJsonBody(req);
    const configCandidate =
      typeof body === "object" &&
      body !== null &&
      "config" in body &&
      (body as { config?: unknown }).config !== undefined
        ? (body as { config: unknown }).config
        : body;

    const parsed = registrationConfigV1Schema.safeParse(configCandidate);
    if (!parsed.success) {
      return jsonNoStore(
        {
          error: "Configuration invalide",
          details: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "config"} : ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    const crossRefIssues = validateRegistrationConfigCrossRefs(parsed.data);
    if (crossRefIssues.length > 0) {
      return jsonNoStore(
        {
          error: "Configuration invalide",
          details: crossRefIssues.map((i) => `${i.path} : ${i.message}`),
        },
        { status: 400 }
      );
    }

    await saveDraftRegistrationConfig(parsed.data as RegistrationConfigV1, auth.session.uid);

    return jsonNoStore({
      success: true,
      catalogVersion: parsed.data.meta.catalogVersion,
    });
  } catch (error) {
    console.error("[registration-config/draft] PUT error", error);
    return jsonNoStore(
      { error: "Erreur lors de l'enregistrement du brouillon" },
      { status: 500 }
    );
  }
}
