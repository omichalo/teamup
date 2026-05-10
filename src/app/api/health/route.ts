// app/api/health/route.ts
import { jsonNoStore } from "@/lib/http/cache-headers";

// Pas forcément obligatoire, mais tu peux forcer le runtime node :
export const runtime = "nodejs";

export async function GET() {
  // Optionnel : un log minimal pour savoir que le ping passe
  console.log("[health] ping");

  return jsonNoStore(
    { ok: true, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
