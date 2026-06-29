import type { PriceQuote } from "@/lib/pricing/types";
import {
  isValidVoluntaryDonationCents,
  resolveDonationPricing,
  type DonationPricingBreakdown,
} from "@/lib/pricing/donation-discount";

export function readVoluntaryDonationCents(data: Record<string, unknown>): number {
  const value = data.voluntaryDonationCents;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return 0;
  }
  return value;
}

export function resolveRegistrationDonationPricing(
  quote: PriceQuote,
  data: Record<string, unknown>
): DonationPricingBreakdown {
  const voluntaryDonationCents = readVoluntaryDonationCents(data);
  if (!isValidVoluntaryDonationCents(voluntaryDonationCents)) {
    throw new Error("Montant de don invalide (0 ou minimum 1 €).");
  }
  return resolveDonationPricing(quote, voluntaryDonationCents);
}
