import type { PriceQuote } from "@/lib/pricing/types";
import { isValidVoluntaryDonationCents } from "@/lib/pricing/donation-discount";
import {
  readVoluntaryDonationCents,
  resolveRegistrationDonationPricing,
} from "./resolve-registration-donation";

/** Enrichit un patch admin avec remise don et montant aligné si pertinent. */
export function applyDonationPricingPatch(
  pricingPatch: Record<string, unknown>,
  quote: PriceQuote,
  mergedForPricing: Record<string, unknown>,
  currentData: Record<string, unknown>
): void {
  const donationCents = readVoluntaryDonationCents(mergedForPricing);
  if (!isValidVoluntaryDonationCents(donationCents)) {
    return;
  }

  const donation = resolveRegistrationDonationPricing(quote, mergedForPricing);
  pricingPatch.donationDiscountCents = donation.donationDiscountCents;

  const currentPaymentAmount =
    typeof currentData.paymentAmountCents === "number"
      ? currentData.paymentAmountCents
      : quote.totalCents;
  const mergedPaymentAmount = mergedForPricing.paymentAmountCents;

  if (
    typeof mergedPaymentAmount === "number" &&
    mergedPaymentAmount === currentPaymentAmount
  ) {
    pricingPatch.paymentAmountCents = donation.invoiceTotalCents;
  }
}
