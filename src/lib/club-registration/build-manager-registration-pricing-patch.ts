import { FieldValue } from "firebase-admin/firestore";
import { ensureRegistrationConfigSeeded, getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { calculateQuoteWithConfig } from "@/lib/club-registration-config/pricing-resolve";
import { buildPricingContextFromRecord } from "@/lib/pricing/from-registration-record";
import { isValidVoluntaryDonationCents } from "@/lib/pricing/donation-discount";
import { applyDonationPricingPatch } from "./apply-donation-pricing-patch";
import {
  readVoluntaryDonationCents,
  resolveRegistrationDonationPricing,
} from "./resolve-registration-donation";
import { buildPaymentSyncPatchForQuote } from "./payment/sync-payment-after-quote-change";

export async function buildManagerRegistrationPricingPatch(
  mergedForPricing: Record<string, unknown>,
  currentData: Record<string, unknown>,
  paymentSourceData: Record<string, unknown> = currentData
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

  const donationCents = readVoluntaryDonationCents(mergedForPricing);
  const invoiceTotalCents = isValidVoluntaryDonationCents(donationCents)
    ? resolveRegistrationDonationPricing(quote, mergedForPricing).invoiceTotalCents
    : quote.totalCents;
  Object.assign(
    pricingPatch,
    buildPaymentSyncPatchForQuote({
      currentData: paymentSourceData,
      invoiceTotalCents,
    })
  );

  return pricingPatch;
}
