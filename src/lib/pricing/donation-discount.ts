import type { PriceQuote } from "./types";

/** Montant minimum du don libre (1 €) lorsqu'un don est choisi. */
export const VOLUNTARY_DONATION_MIN_CENTS = 100;

/** Plafond de la remise liée au don (73 €). */
export const DONATION_DISCOUNT_MAX_CENTS = 7_300;

/** Taux de remise sur l'adhésion : 25 % du don. */
export const DONATION_DISCOUNT_RATE = 0.25;

export function isValidVoluntaryDonationCents(cents: number): boolean {
  return Number.isInteger(cents) && (cents === 0 || cents >= VOLUNTARY_DONATION_MIN_CENTS);
}

/** Adhésion club nette après remises catalogue (centimes). */
export function getMembershipNetCents(quote: PriceQuote): number {
  const membership = quote.lines.find((line) => line.kind === "membership");
  if (!membership) {
    return 0;
  }

  const catalogDiscountCents = quote.lines
    .filter(
      (line) =>
        line.kind === "discount_family" ||
        line.kind === "discount_female_first" ||
        line.kind === "discount_aid"
    )
    .reduce((sum, line) => sum + line.amountCents, 0);

  return Math.max(0, membership.amountCents + catalogDiscountCents);
}

export function computeDonationDiscountCents(
  donationCents: number,
  membershipNetCents: number
): number {
  if (donationCents <= 0 || membershipNetCents <= 0) {
    return 0;
  }

  const rawDiscount = Math.floor(donationCents * DONATION_DISCOUNT_RATE);
  return Math.min(rawDiscount, DONATION_DISCOUNT_MAX_CENTS, membershipNetCents);
}

export function computeInvoiceTotalCents(
  quoteTotalCents: number,
  donationCents: number,
  membershipNetCents: number
): number {
  const discount = computeDonationDiscountCents(donationCents, membershipNetCents);
  return Math.max(0, quoteTotalCents + donationCents - discount);
}

export type DonationPricingBreakdown = {
  voluntaryDonationCents: number;
  donationDiscountCents: number;
  membershipNetCents: number;
  invoiceTotalCents: number;
};

export function resolveDonationPricing(
  quote: PriceQuote,
  voluntaryDonationCents: number
): DonationPricingBreakdown {
  const membershipNetCents = getMembershipNetCents(quote);
  const donationDiscountCents = computeDonationDiscountCents(
    voluntaryDonationCents,
    membershipNetCents
  );

  return {
    voluntaryDonationCents,
    donationDiscountCents,
    membershipNetCents,
    invoiceTotalCents: computeInvoiceTotalCents(
      quote.totalCents,
      voluntaryDonationCents,
      membershipNetCents
    ),
  };
}
