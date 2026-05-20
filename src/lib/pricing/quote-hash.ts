import crypto from "node:crypto";
import type { PriceQuote } from "./types";

/** Empreinte courte du devis pour traçabilité Stripe (metadata). */
export function hashPriceQuote(quote: PriceQuote): string {
  const payload = JSON.stringify({
    catalogVersion: quote.catalogVersion,
    segmentLabel: quote.segmentLabel,
    totalCents: quote.totalCents,
    lines: quote.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      amountCents: line.amountCents,
    })),
  });
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16);
}
