import type { PriceQuote } from "./types";
import { PRICING_CATALOG_VERSION } from "./types";

function isPriceLineKind(value: unknown): value is PriceQuote["lines"][number]["kind"] {
  return (
    value === "membership" ||
    value === "fftt_license" ||
    value === "competition" ||
    value === "discount_family" ||
    value === "discount_female_first" ||
    value === "info"
  );
}

/** Valide un snapshot `pricingQuote` lu depuis Firestore. */
export function parseStoredPriceQuote(value: unknown): PriceQuote | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.lines)) {
    return null;
  }

  const lines: PriceQuote["lines"] = [];
  for (const entry of raw.lines) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const line = entry as Record<string, unknown>;
    if (
      typeof line.id !== "string" ||
      !isPriceLineKind(line.kind) ||
      typeof line.label !== "string" ||
      typeof line.amountCents !== "number"
    ) {
      return null;
    }
    lines.push({
      id: line.id,
      kind: line.kind,
      label: line.label,
      amountCents: line.amountCents,
      source: line.source === "pending_validation" ? "pending_validation" : "catalog",
    });
  }

  const totalCents = typeof raw.totalCents === "number" ? raw.totalCents : 0;
  const subtotalCents = typeof raw.subtotalCents === "number" ? raw.subtotalCents : totalCents;

  return {
    catalogVersion:
      typeof raw.catalogVersion === "string"
        ? (raw.catalogVersion as PriceQuote["catalogVersion"])
        : PRICING_CATALOG_VERSION,
    segmentLabel: typeof raw.segmentLabel === "string" ? raw.segmentLabel : "—",
    lines,
    subtotalCents,
    totalCents,
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.filter((w): w is string => typeof w === "string")
      : [],
    requiresAdminReview: Boolean(raw.requiresAdminReview),
  };
}
