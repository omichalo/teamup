import { FieldValue } from "firebase-admin/firestore";
import { ensureRegistrationConfigSeeded, getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { calculateQuoteWithConfig } from "@/lib/club-registration-config/pricing-resolve";
import { buildPricingContextFromRecord } from "@/lib/pricing/from-registration-record";
import { applyDonationPricingPatch } from "./apply-donation-pricing-patch";

export async function buildManagerRegistrationPricingPatch(
  mergedForPricing: Record<string, unknown>,
  currentData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const pricingCtx = buildPricingContextFromRecord(mergedForPricing);
  if (!pricingCtx) {
    return {};
  }

  await ensureRegistrationConfigSeeded();
  const config = await getActiveRegistrationConfig();
  const quote = calculateQuoteWithConfig(pricingCtx, config);

  const pricingPatch: Record<string, unknown> = {
    pricingQuote: quote,
    pricingQuoteStatus: "proposed",
    pricingQuoteComputedAt: FieldValue.serverTimestamp(),
  };
  applyDonationPricingPatch(pricingPatch, quote, mergedForPricing, currentData);
  return pricingPatch;
}
