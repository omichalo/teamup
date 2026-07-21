export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import { searchLicenseValidations } from "@/lib/license-validation/list-license-validations";

export async function POST(req: Request) {
  try {
    const auth = await requireLicenseValidationActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      query?: string;
      limit?: number;
    };
    const query = typeof body.query === "string" ? body.query : "";
    const limit =
      Number.isInteger(body.limit) && (body.limit as number) > 0
        ? Math.min(body.limit as number, 25)
        : 10;

    const db = getFirestoreAdmin();
    const registrations = await searchLicenseValidations(db, query, limit);
    return jsonNoStore({ registrations });
  } catch (error) {
    console.error("[api/club/license-validations/search POST] error", error);
    return jsonNoStore(
      {
        error: "Erreur lors de la recherche",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
