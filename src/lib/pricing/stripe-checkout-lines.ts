import type { PriceLine, PriceQuote } from "./types";
import { formatCentsAsEuros, stripeCheckoutLines } from "./format";

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

const MEMBERSHIP_LABEL = "Adhésion club";
const MEMBERSHIP_LABEL_WITH_DISCOUNTS = "Adhésion club (net après remises)";
const STRIPE_CUSTOM_FIELD_VALUE_MAX = 500;

function isMembershipDiscount(line: PriceLine): boolean {
  return line.kind === "discount_family" || line.kind === "discount_female_first";
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
  quote: PriceQuote
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
    name: hasDiscounts ? MEMBERSHIP_LABEL_WITH_DISCOUNTS : MEMBERSHIP_LABEL,
    amountCents: netMembership,
    description,
  };
}

/**
 * Champs personnalisés facture Stripe (bloc informatif, hors lignes négatives).
 */
export function buildStripeInvoiceCustomFields(quote: PriceQuote): StripeInvoiceCustomField[] {
  const discountText = formatDiscountBreakdown(quote);
  if (!discountText) {
    return [];
  }

  return [
    {
      name: "Remises sur adhésion",
      value: truncateForStripe(discountText, STRIPE_CUSTOM_FIELD_VALUE_MAX),
    },
  ];
}

/**
 * Convertit un devis en lignes Stripe Checkout (montants ≥ 0).
 * Les remises catalogue sont intégrées au net de la ligne adhésion, avec libellé
 * et description détaillant le brut, les remises et le net facturé.
 */
export function buildStripeCheckoutLineItems(quote: PriceQuote): StripeCheckoutLineItem[] {
  const lines = stripeCheckoutLines(quote);
  const membership = lines.find((line) => line.kind === "membership");
  const discountCents = lines
    .filter(isMembershipDiscount)
    .reduce((sum, line) => sum + line.amountCents, 0);

  const items: StripeCheckoutLineItem[] = [];

  if (membership) {
    const membershipLine = buildMembershipStripeLine(membership, discountCents, quote);
    if (membershipLine) {
      items.push(membershipLine);
    }
  }

  for (const line of lines) {
    if (
      line.kind === "membership" ||
      line.kind === "discount_family" ||
      line.kind === "discount_female_first"
    ) {
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

  return items;
}

export function sumStripeCheckoutLineItems(items: StripeCheckoutLineItem[]): number {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

/** Vérifie la cohérence entre le devis et les lignes envoyées à Stripe. */
export function assertStripeLinesMatchQuote(
  quote: PriceQuote,
  items: StripeCheckoutLineItem[]
): void {
  const expected = quote.totalCents;
  const actual = sumStripeCheckoutLineItems(items);
  if (actual !== expected) {
    throw new Error(
      `Incohérence devis / Stripe : attendu ${expected} cts, obtenu ${actual} cts`
    );
  }
  if (items.length === 0) {
    throw new Error("Aucune ligne Stripe à facturer pour ce devis.");
  }
}
