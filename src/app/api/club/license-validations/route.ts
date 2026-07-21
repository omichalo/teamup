export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import {
  LICENSE_VALIDATION_PAGE_SIZE_DEFAULT,
  LICENSE_VALIDATION_PAGE_SIZE_MAX,
  listLicenseValidations,
  resolveLicenseValidationListFilter,
} from "@/lib/license-validation/list-license-validations";

export async function GET(req: Request) {
  try {
    const auth = await requireLicenseValidationActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const statusFilter = resolveLicenseValidationListFilter(url.searchParams.get("status"));
    const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const pageSize = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), LICENSE_VALIDATION_PAGE_SIZE_MAX)
      : LICENSE_VALIDATION_PAGE_SIZE_DEFAULT;
    const cursor = url.searchParams.get("cursor");
    const searchQuery = url.searchParams.get("q");

    const db = getFirestoreAdmin();
    const page = await listLicenseValidations(db, {
      statusFilter,
      pageSize,
      cursor,
      searchQuery,
    });

    return jsonNoStore(page);
  } catch (error) {
    console.error("[api/club/license-validations GET] error", error);
    return jsonNoStore(
      {
        error: "Erreur lors du chargement des validations de licence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
