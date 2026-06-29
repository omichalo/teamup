export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { getClientIp } from "@/lib/auth/request-ip";
import { enforceRateLimit } from "@/lib/auth/rate-limit-http";
import { createFFTTAPI } from "@/lib/shared/fftt-utils";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { findRegistrationLicenseConflicts } from "@/lib/club-registration/find-registration-license-conflicts";

const LICENSE_RE = /^[0-9]{5,12}$/;

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Recherche publique contrôlée d'une licence pendant le parcours
 * d'inscription. On ne renvoie qu'un sous-ensemble utile au formulaire.
 */
export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rateLimited = enforceRateLimit(
      `club-registration-license-lookup:${ip}`,
      20,
      15 * 60 * 1000
    );
    if (rateLimited) return rateLimited;

    const body = ((await req.json()) ?? {}) as Record<string, unknown>;
    const licence =
      typeof body.licence === "string" ? body.licence.replace(/\D/g, "") : "";
    const excludeRegistrationId =
      typeof body.excludeRegistrationId === "string" &&
      body.excludeRegistrationId.trim().length > 0
        ? body.excludeRegistrationId.trim()
        : null;

    if (!LICENSE_RE.test(licence)) {
      return jsonNoStore(
        { error: "Numéro de licence invalide" },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const licenseUsage = await findRegistrationLicenseConflicts(
      db,
      licence,
      excludeRegistrationId
    );

    const api = createFFTTAPI();
    await api.initialize();

    try {
      const details = await api.getJoueurDetailsByLicence(licence);
      return jsonNoStore(
        {
          found: true,
          player: {
            licence,
            nom: stringOrUndefined(details.nom),
            prenom: stringOrUndefined(details.prenom),
            isHomme:
              typeof details.isHomme === "boolean" ? details.isHomme : undefined,
            numClub: stringOrUndefined(details.numClub),
            nomClub: stringOrUndefined(details.nomClub),
            categorie: stringOrUndefined(details.categorie),
            typeLicence: stringOrUndefined(details.typeLicence),
            certificat: stringOrUndefined(details.certificat),
            nationalite: stringOrUndefined(details.nationalite),
            pointsLicence: numberOrNull(details.pointsLicence),
          },
          licenseUsage,
        },
        { status: 200 }
      );
    } catch {
      return jsonNoStore({ found: false, licenseUsage }, { status: 200 });
    }
  } catch (error) {
    console.error("[api/club/registration/license-lookup POST]", error);
    return jsonNoStore(
      { error: "Impossible de rechercher cette licence pour le moment" },
      { status: 500 }
    );
  }
}
