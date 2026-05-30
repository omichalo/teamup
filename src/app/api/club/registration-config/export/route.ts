export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getActiveRegistrationConfig,
  getDraftRegistrationConfig,
} from "@/lib/club-registration-config/store";
import { buildConfigExport, serializeConfigExport } from "@/lib/club-registration-config/export-import";
import { requireRegistrationManager } from "@/lib/club-registration-config/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireRegistrationManager();
  if (!auth.ok) return auth.response;

  try {
    const scope = req.nextUrl.searchParams.get("scope") === "active" ? "active" : "draft";
    const config =
      scope === "active"
        ? await getActiveRegistrationConfig()
        : await getDraftRegistrationConfig();

    const payload = serializeConfigExport(config);
    const exportDoc = buildConfigExport(config);
    const filename = `inscription-club-${exportDoc.config.meta.catalogVersion}-${scope}.teamup-registration-config.json`;

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[registration-config/export] GET error", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}
