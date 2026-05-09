import { NextResponse } from "next/server";

/**
 * En-têtes anti-cache pour réponses HTTP sensibles (sessions, données utilisateur).
 * Aligné sur les règles projet (.cursorrules).
 */
export function applyNoStoreHeaders(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

/** Réponse JSON avec en-têtes no-store (routes API sensibles). */
export function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  return applyNoStoreHeaders(NextResponse.json(body, init));
}
