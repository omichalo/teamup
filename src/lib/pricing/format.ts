import type { PriceLine, PriceQuote } from "./types";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** Affiche un montant en centimes au format EUR français. */
export function formatCentsAsEuros(amountCents: number): string {
  return euroFormatter.format(amountCents / 100);
}

/** Lignes facturables (hors info à 0 €). */
export function billableLines(quote: PriceQuote): PriceLine[] {
  return quote.lines.filter((line) => line.kind !== "info");
}

/** Lignes à envoyer à Stripe (montant non nul). */
export function stripeCheckoutLines(quote: PriceQuote): PriceLine[] {
  return billableLines(quote).filter((line) => line.amountCents !== 0);
}
