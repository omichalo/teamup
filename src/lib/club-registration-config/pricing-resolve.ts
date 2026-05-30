import { calculateQuoteFromConfig } from "./pricing-engine";
import {
  getActiveRegistrationConfig,
  getRegistrationConfigByCatalogVersion,
} from "./store";
import type { RegistrationConfigV1 } from "./types";
import type { PriceQuote, PricingContext } from "@/lib/pricing/types";
import { buildPricingContextFromRecord } from "@/lib/pricing/from-registration-record";

function readCatalogVersionFromRecord(
  record: Record<string, unknown>
): string | undefined {
  const pricingQuote = record.pricingQuote;
  if (
    typeof pricingQuote === "object" &&
    pricingQuote !== null &&
    "catalogVersion" in pricingQuote &&
    typeof (pricingQuote as { catalogVersion?: unknown }).catalogVersion === "string"
  ) {
    return (pricingQuote as { catalogVersion: string }).catalogVersion;
  }
  if (typeof record.catalogVersion === "string") {
    return record.catalogVersion;
  }
  return undefined;
}

export async function resolveRegistrationConfigForRecord(
  record: Record<string, unknown>
): Promise<RegistrationConfigV1> {
  const version = readCatalogVersionFromRecord(record);
  if (version) {
    return getRegistrationConfigByCatalogVersion(version);
  }
  return getActiveRegistrationConfig();
}

export async function calculateQuoteForRecord(
  record: Record<string, unknown>
): Promise<PriceQuote | null> {
  const ctx = buildPricingContextFromRecord(record);
  if (!ctx) return null;
  const config = await resolveRegistrationConfigForRecord(record);
  return calculateQuoteFromConfig(ctx, config);
}

export function calculateQuoteWithConfig(
  ctx: PricingContext,
  config: RegistrationConfigV1
): PriceQuote {
  return calculateQuoteFromConfig(ctx, config);
}
