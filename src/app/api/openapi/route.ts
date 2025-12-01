import { createSecureResponse } from "@/lib/api/response-utils";
import { openApiSpec } from "@/lib/openapi";

export async function GET() {
  return createSecureResponse(openApiSpec, 200);
}


