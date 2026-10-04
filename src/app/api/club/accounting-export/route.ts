export const runtime = "nodejs";

import { z } from "zod";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { buildSageExportPack } from "@/lib/accounting-export/build-export-pack";

const bodySchema = z.object({
  seasonLabel: z.string().trim().min(1).max(120).optional(),
});

export async function GET() {
  try {
    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const config = await getActiveRegistrationConfig();
    return jsonNoStore({
      seasonLabel: config.meta.seasonLabel,
    });
  } catch (error) {
    console.error("[api/club/accounting-export GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger la saison active" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const rate = checkRateLimit(
      `club-accounting-export:${auth.uid}`,
      5,
      15 * 60 * 1000
    );
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop d'exports. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const raw = ((await req.json().catch(() => ({}))) ?? {}) as unknown;
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonNoStore({ error: "Paramètres invalides" }, { status: 400 });
    }

    let seasonLabel = parsed.data.seasonLabel ?? null;
    if (!seasonLabel) {
      const config = await getActiveRegistrationConfig();
      seasonLabel = config.meta.seasonLabel;
    }

    const db = getFirestoreAdmin();
    const projectId =
      process.env.FB_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      "unknown";

    const pack = await buildSageExportPack({
      db,
      projectId,
      seasonLabel,
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_ACCOUNTING_EXPORT, auth.uid, {
      resource: "clubAccountingExport",
      details: {
        seasonLabel: pack.control.seasonLabel,
        pieceCount: pack.control.summary.pieceCount,
        lineCount: pack.control.summary.lineCount,
        balanced: pack.control.summary.balanced,
        anomalyCount: Object.values(pack.control.anomalyCounts).reduce(
          (sum, n) => sum + n,
          0
        ),
      },
      success: true,
    });

    return jsonNoStore({
      control: pack.control,
      fileName: pack.fileName,
      zipBase64: pack.zipBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("[api/club/accounting-export POST]", error);
    return jsonNoStore(
      { error: "Impossible de générer l'export comptable" },
      { status: 500 }
    );
  }
}
