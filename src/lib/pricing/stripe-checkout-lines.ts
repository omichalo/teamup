import type { StripePresentationConfig } from "@/lib/club-registration-config/types";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import type { DonationPricingBreakdown } from "./donation-discount";
import type { PriceLine, PriceQuote } from "./types";
import { formatCentsAsEuros, stripeCheckoutLines } from "./format";
import type { PaymentAid } from "@/lib/club-registration/payment/types";

export type StripeCheckoutLineItem = {
  /** Libellé affiché sur la facture Stripe (ligne produit). */
  name: string;
  amountCents: number;
  description?: string;
};

export type StripeInvoiceCustomField = {
  name: string;
  value: string;
};

export type DonationStripeContext = Pick<
  DonationPricingBreakdown,
  "voluntaryDonationCents" | "donationDiscountCents"
>;

const STRIPE_CUSTOM_FIELD_VALUE_MAX = 500;

function isMembershipDiscount(line: PriceLine): boolean {
  return (
    line.kind === "discount_family" ||
    line.kind === "discount_female_first" ||
    line.kind === "discount_aid"
  );
}

function truncateForStripe(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

/** Texte des remises pour description de ligne ou champ personnalisé facture. */
export function formatDiscountBreakdown(quote: PriceQuote): string | null {
  const discounts = quote.lines.filter(isMembershipDiscount);
  if (discounts.length === 0) {
    return null;
  }
  return discounts
    .map((line) => `${line.label} : ${formatCentsAsEuros(line.amountCents)}`)
    .join(" ; ");
}

function buildMembershipStripeLine(
  membership: PriceLine,
  discountCents: number,
  quote: PriceQuote,
  stripe: StripePresentationConfig
): StripeCheckoutLineItem | null {
  const netMembership = membership.amountCents + discountCents;
  if (netMembership <= 0) {
    return null;
  }

  const hasDiscounts = discountCents < 0;
  const grossLabel = formatCentsAsEuros(membership.amountCents);
  const netLabel = formatCentsAsEuros(netMembership);
  const discountText = formatDiscountBreakdown(quote);

  let description = quote.segmentLabel;
  if (hasDiscounts && discountText) {
    description = truncateForStripe(
      `Tarif adhésion ${grossLabel} ; ${discountText} ; montant facturé ${netLabel}. ${quote.segmentLabel}`,
      STRIPE_CUSTOM_FIELD_VALUE_MAX
    );
  }

  return {
    name: hasDiscounts
      ? stripe.membershipLabelWithDiscounts
      : stripe.membershipLabel,
    amountCents: netMembership,
    description,
  };
}

/**
 * Champs personnalisés facture Stripe (bloc informatif, hors lignes négatives).
 */
export function buildStripeInvoiceCustomFields(
  quote: PriceQuote,
  stripePresentation?: StripePresentationConfig,
  donation?: DonationStripeContext,
  secretariatAids?: PaymentAid[]
): StripeInvoiceCustomField[] {
  const stripe =
    stripePresentation ?? getDefaultRegistrationConfig().stripePresentation;
  const fields: StripeInvoiceCustomField[] = [];

  const discountText = formatDiscountBreakdown(quote);
  if (discountText) {
    fields.push({
      name: stripe.discountCustomFieldName,
      value: truncateForStripe(discountText, STRIPE_CUSTOM_FIELD_VALUE_MAX),
    });
  }

  if (donation && donation.voluntaryDonationCents > 0) {
    fields.push({
      name: "Don et remise adhésion",
      value: truncateForStripe(
        `Don : ${formatCentsAsEuros(donation.voluntaryDonationCents)} ; remise 25 % (plaf. 73 €) : −${formatCentsAsEuros(donation.donationDiscountCents)}`,
        STRIPE_CUSTOM_FIELD_VALUE_MAX
      ),
    });
  }

  const activeAids = (secretariatAids ?? []).filter((aid) => aid.amountCents > 0);
  if (activeAids.length > 0) {
    fields.push({
      name: "Aides secrétariat",
      value: truncateForStripe(
        activeAids
          .map((aid) => `${aid.label} : −${formatCentsAsEuros(aid.amountCents)}`)
          .join(" ; "),
        STRIPE_CUSTOM_FIELD_VALUE_MAX
      ),
    });
  }

  return fields;
}

/**
 * Convertit un devis en lignes Stripe Checkout (montants ≥ 0).
 * Les remises catalogue sont intégrées au net de la ligne adhésion, avec libellé
 * et description détaillant le brut, les remises et le net facturé.
 */
export function buildStripeCheckoutLineItems(
  quote: PriceQuote,
  stripePresentation?: StripePresentationConfig,
  donation?: DonationStripeContext
): StripeCheckoutLineItem[] {
  const stripe =
    stripePresentation ?? getDefaultRegistrationConfig().stripePresentation;
  const lines = stripeCheckoutLines(quote);
  const membership = lines.find((line) => line.kind === "membership");
  const discountCents = lines
    .filter(isMembershipDiscount)
    .reduce((sum, line) => sum + line.amountCents, 0);

  const items: StripeCheckoutLineItem[] = [];

  if (membership) {
    const membershipLine = buildMembershipStripeLine(
      membership,
      discountCents,
      quote,
      stripe
    );
    if (membershipLine) {
      items.push(membershipLine);
    }
  }

  for (const line of lines) {
    if (isMembershipDiscount(line) || line.kind === "membership") {
      continue;
    }
    if (line.amountCents > 0) {
      items.push({
        name: line.label,
        amountCents: line.amountCents,
        description: quote.segmentLabel,
      });
    }
  }

  if (donation && donation.voluntaryDonationCents > 0) {
    items.push({
      name: stripe.donationLabel,
      amountCents: donation.voluntaryDonationCents,
      description: "Don libre au profit du club",
    });
  }

  return items;
}

export function sumStripeCheckoutLineItems(items: StripeCheckoutLineItem[]): number {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

/** Montant encaissé après coupon de remise don (si applicable). */
export function computeStripeCheckoutPayableCents(
  quote: PriceQuote,
  items: StripeCheckoutLineItem[],
  donation?: DonationStripeContext
): number {
  const lineSum = sumStripeCheckoutLineItems(items);
  const discount = donation?.donationDiscountCents ?? 0;
  const expectedFromQuote =
    quote.totalCents + (donation?.voluntaryDonationCents ?? 0) - discount;
  if (lineSum - discount !== expectedFromQuote) {
    throw new Error(
      `Incohérence lignes Stripe : somme ${lineSum} cts, remise ${discount} cts, attendu ${expectedFromQuote} cts`
    );
  }
  return lineSum - discount;
}

/** Vérifie la cohérence entre le devis, le don et les lignes envoyées à Stripe. */
export function assertStripeLinesMatchQuote(
  quote: PriceQuote,
  items: StripeCheckoutLineItem[],
  donation?: DonationStripeContext
): void {
  const expected = donation
    ? quote.totalCents +
      donation.voluntaryDonationCents -
      donation.donationDiscountCents
    : quote.totalCents;
  const actual = computeStripeCheckoutPayableCents(quote, items, donation);
  if (actual !== expected) {
    throw new Error(
      `Incohérence devis / Stripe : attendu ${expected} cts, obtenu ${actual} cts`
    );
  }
  if (items.length === 0) {
    throw new Error("Aucune ligne Stripe à facturer pour ce devis.");
  }
}
