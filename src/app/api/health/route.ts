// app/api/health/route.ts
import { createSecureResponse } from "@/lib/api/response-utils";

// Pas forcément obligatoire, mais tu peux forcer le runtime node :
export const runtime = "nodejs";

export async function GET() {
  // Optionnel : un log minimal pour savoir que le ping passe
  console.log("[health] ping");

  return createSecureResponse(
    { ok: true, timestamp: new Date().toISOString() },
    200
  );
}
