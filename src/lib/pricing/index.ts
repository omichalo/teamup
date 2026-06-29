export { buildPricingContext } from "./build-context";
export { buildPricingContextFromRecord } from "./from-registration-record";
export {
  calculateQuote,
} from "./calculate-quote";
export {
  COMPETITION_LABELS,
  COMPETITION_PRICE_CENTS,
  FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS,
  FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS,
} from "./catalog/sqyping-2025";
export {
  formatCentsAsEuros,
  billableLines,
  stripeCheckoutLines,
} from "./format";
/** Réservé au serveur (Stripe, API) — ne pas réexporter ici : évite `node:crypto` côté client. */
export {
  assertStripeLinesMatchQuote,
  buildStripeCheckoutLineItems,
  buildStripeInvoiceCustomFields,
  formatDiscountBreakdown,
  sumStripeCheckoutLineItems,
  computeStripeCheckoutPayableCents,
  type DonationStripeContext,
  type StripeInvoiceCustomField,
} from "./stripe-checkout-lines";
export {
  resolveClassicAgeBand,
  resolveHandisportCompetitionAgeBand,
  resolveSportAdapteAgeBand,
} from "./resolve-age-band";
export { resolveBaseRates } from "./resolve-base-rates";
export {
  DONATION_DISCOUNT_MAX_CENTS,
  DONATION_DISCOUNT_RATE,
  VOLUNTARY_DONATION_MIN_CENTS,
  computeDonationDiscountCents,
  computeInvoiceTotalCents,
  getMembershipNetCents,
  isValidVoluntaryDonationCents,
  resolveDonationPricing,
  type DonationPricingBreakdown,
} from "./donation-discount";
export {
  PRICING_CATALOG_VERSION,
  type FamilyRegistrationOrder,
  type PriceLine,
  type PriceLineKind,
  type PriceLineSource,
  type PriceQuote,
  type PricingCatalogVersion,
  type PricingContext,
} from "./types";
