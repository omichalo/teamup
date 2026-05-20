import type { PriceQuote } from "./types";
import { stripeCheckoutLines } from "./format";

export type StripeCheckoutLineItem = {
  /** Libellé générique affiché sur la facture Stripe. */
  name: string;
  amountCents: number;
  description?: string;
};

/**
 * Convertit un devis en lignes Stripe Checkout (montants ≥ 0).
 * Les remises catalogue sont intégrées au net de la ligne « Adhésion club »
 * (Stripe n'accepte pas de `unit_amount` négatif sur les line_items).
 */
export function buildStripeCheckoutLineItems(quote: PriceQuote): StripeCheckoutLineItem[] {
  const lines = stripeCheckoutLines(quote);
  const membership = lines.find((line) => line.kind === "membership");
  const discountCents = lines
    .filter((line) => line.kind === "discount_family" || line.kind === "discount_female_first")
    .reduce((sum, line) => sum + line.amountCents, 0);

  const items: StripeCheckoutLineItem[] = [];

  if (membership) {
    const netMembership = membership.amountCents + discountCents;
    if (netMembership > 0) {
      items.push({
        name: membership.label,
        amountCents: netMembership,
        description:
          discountCents < 0
            ? `Inclut les réductions appliquées sur l'adhésion (${quote.segmentLabel})`
            : quote.segmentLabel,
      });
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
