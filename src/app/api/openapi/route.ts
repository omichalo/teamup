export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { openApiSpec } from "@/lib/openapi";

export async function GET() {
  return jsonNoStore(openApiSpec, { status: 200 });
}


