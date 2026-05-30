export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  ensureRegistrationConfigSeeded,
  getActiveRegistrationConfig,
  getRegistrationConfigDoc,
  REGISTRATION_CONFIG_ACTIVE_ID,
} from "@/lib/club-registration-config/store";

export async function GET() {
  const rateLimit = checkRateLimit("registration-config:active", 120, 60_000);
  if (!rateLimit.allowed) {
    return jsonNoStore({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    await ensureRegistrationConfigSeeded();
    const config = await getActiveRegistrationConfig();
    const meta = await getRegistrationConfigDoc(REGISTRATION_CONFIG_ACTIVE_ID);

    return jsonNoStore({
      config,
      publishedAt: meta?.publishedAt ?? null,
      catalogVersion: config.meta.catalogVersion,
    });
  } catch (error) {
    console.error("[registration-config/active] GET error", error);
    return jsonNoStore(
      { error: "Erreur lors de la récupération de la configuration" },
      { status: 500 }
    );
  }
}
