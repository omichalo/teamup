export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { BanFeature, BanSearchResponse } from "@/lib/geocoding/ban";
import {
  buildSupplementalBanQuery,
  mergeBanFeaturesPreferHigherScore,
} from "@/lib/geocoding/ban-supplemental-query";

const BAN_SEARCH_URL = "https://api-adresse.data.gouv.fr/search/";

async function fetchBanFeatures(query: string): Promise<BanFeature[]> {
  const banUrl = new URL(BAN_SEARCH_URL);
  banUrl.searchParams.set("q", query);
  banUrl.searchParams.set("limit", "25");
  const upstream = await fetch(banUrl.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!upstream.ok) {
    throw new Error(`BAN upstream ${upstream.status}`);
  }
  const data = (await upstream.json()) as BanSearchResponse;
  return data.features ?? [];
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Proxy vers l’API Adresse (BAN / data.gouv), sans clé API.
 * Pas d’auth obligatoire : données publiques ; limitation par IP pour éviter l’abus.
 * (Une session Firebase peut échouer en local sans credentials → liste vide côté UI.)
 */
export async function GET(req: Request) {
  try {
    const ip = clientIp(req);
    const rate = checkRateLimit(`ban-geo:${ip}`, 180, 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 3) {
      return jsonNoStore({ features: [] }, { status: 200 });
    }
    if (q.length > 200) {
      return jsonNoStore({ error: "Requête trop longue" }, { status: 400 });
    }

    let raw: BanFeature[];
    try {
      raw = await fetchBanFeatures(q);
    } catch {
      return jsonNoStore({ error: "Service d’adresses indisponible" }, { status: 502 });
    }

    const supplement = buildSupplementalBanQuery(q);
    if (supplement && supplement !== q.trim()) {
      try {
        const secondary = await fetchBanFeatures(supplement);
        raw = mergeBanFeaturesPreferHigherScore(raw, secondary);
      } catch {
        /* ignore : la requête principale suffit */
      }
    }

    /* Pas de filtre par segments ici : il écartait parfois toutes les lignes ; le client affiche les libellés BAN tels quels. */
    return jsonNoStore({ features: raw.slice(0, 25) }, { status: 200 });
  } catch (error) {
    console.error("[api/geocode/ban]", error);
    return jsonNoStore({ error: "Impossible de rechercher l’adresse" }, { status: 500 });
  }
}
