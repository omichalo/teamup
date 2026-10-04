import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import type { AccountingInvoiceDocument } from "@/lib/club-registration/payment-documents/accounting-invoice-types";
import type { DonationPricingBreakdown } from "@/lib/pricing/donation-discount";
import { parseStoredPriceQuote } from "@/lib/pricing/parse-stored-quote";
import type { PriceQuote } from "@/lib/pricing/types";
import { SAGE_ACCOUNTS } from "./chart";
import { foldLabel } from "./format-sage";
import type { SignedAccountSplit } from "./types";

export type VentilationMode = "quote" | "labels" | "fallback";

export type InvoiceVentilation = {
  splits: SignedAccountSplit[];
  mode: VentilationMode;
  warning: string | null;
};

function readDonation(
  quote: PriceQuote,
  data: Record<string, unknown>
): DonationPricingBreakdown | null {
  try {
    return resolveRegistrationDonationPricing(quote, data);
  } catch {
    return null;
  }
}

function pushSplit(
  buckets: Map<string, number>,
  account: string,
  signedCents: number
): void {
  if (signedCents === 0) {
    return;
  }
  buckets.set(account, (buckets.get(account) ?? 0) + signedCents);
}

function splitsFromBuckets(buckets: Map<string, number>): SignedAccountSplit[] {
  return [...buckets.entries()].map(([account, signedCents]) => ({
    account,
    signedCents,
  }));
}

function ventilateFromQuote(
  quote: PriceQuote,
  donation: DonationPricingBreakdown
): SignedAccountSplit[] {
  const buckets = new Map<string, number>();
  for (const line of quote.lines) {
    if (line.kind === "info" || line.amountCents === 0) {
      continue;
    }
    if (line.kind === "fftt_license") {
      pushSplit(buckets, SAGE_ACCOUNTS.ffttPayable, line.amountCents);
      continue;
    }
    pushSplit(buckets, SAGE_ACCOUNTS.cotisation, line.amountCents);
  }
  pushSplit(buckets, SAGE_ACCOUNTS.cotisation, -donation.donationDiscountCents);
  pushSplit(buckets, SAGE_ACCOUNTS.donation, donation.voluntaryDonationCents);
  return splitsFromBuckets(buckets);
}

function classifySnapshotLine(
  label: string,
  amountCents: number,
  donation: DonationPricingBreakdown | null
): { splits: SignedAccountSplit[]; uncertain: boolean } {
  const folded = foldLabel(label);
  if (
    folded.includes("licence") ||
    folded.includes("pas de licence") ||
    folded.includes("sans licence")
  ) {
    return {
      splits: [{ account: SAGE_ACCOUNTS.ffttPayable, signedCents: amountCents }],
      uncertain: false,
    };
  }
  if (folded.includes("ajustement don") && donation) {
    const net = donation.voluntaryDonationCents - donation.donationDiscountCents;
    if (amountCents === net) {
      return {
        splits: [
          { account: SAGE_ACCOUNTS.donation, signedCents: donation.voluntaryDonationCents },
          { account: SAGE_ACCOUNTS.cotisation, signedCents: -donation.donationDiscountCents },
        ].filter((split) => split.signedCents !== 0),
        uncertain: false,
      };
    }
  }
  if (folded.includes("don")) {
    return {
      splits: [{ account: SAGE_ACCOUNTS.donation, signedCents: amountCents }],
      uncertain: folded.includes("ajustement"),
    };
  }
  return {
    splits: [{ account: SAGE_ACCOUNTS.cotisation, signedCents: amountCents }],
    uncertain: false,
  };
}

function ventilateFromLabels(
  doc: AccountingInvoiceDocument,
  donation: DonationPricingBreakdown | null
): InvoiceVentilation {
  const lineSum = doc.lines.reduce((sum, line) => sum + line.amountCents, 0);
  let sign = 1;
  if (lineSum === doc.totalCents) {
    sign = 1;
  } else if (lineSum === -doc.totalCents) {
    sign = -1;
  } else {
    return {
      splits: [{ account: SAGE_ACCOUNTS.cotisation, signedCents: doc.totalCents }],
      mode: "fallback",
      warning:
        "Lignes du snapshot incohérentes avec le total : pièce passée en totalité au 756000.",
    };
  }

  const buckets = new Map<string, number>();
  let uncertain = false;
  for (const line of doc.lines) {
    const classified = classifySnapshotLine(line.label, line.amountCents * sign, donation);
    uncertain = uncertain || classified.uncertain;
    for (const split of classified.splits) {
      pushSplit(buckets, split.account, split.signedCents);
    }
  }

  const splits = splitsFromBuckets(buckets);
  const signedSum = splits.reduce((sum, split) => sum + split.signedCents, 0);
  if (signedSum !== doc.totalCents) {
    return {
      splits: [{ account: SAGE_ACCOUNTS.cotisation, signedCents: doc.totalCents }],
      mode: "fallback",
      warning:
        "Ventilation des libellés déséquilibrée : pièce passée en totalité au 756000.",
    };
  }

  return {
    splits,
    mode: "labels",
    warning: uncertain
      ? "Ligne d'ajustement don non rapprochée du don courant : laissée au 756000."
      : null,
  };
}

/**
 * Ventile une pièce FAC / complément / avoir.
 * Le devis courant ne sert que s'il explique encore le total figé de la facture initiale.
 */
export function ventilateAccountingInvoice(
  doc: AccountingInvoiceDocument,
  data: Record<string, unknown>,
  primaryInvoiceNumber: string | null
): InvoiceVentilation {
  if (doc.totalCents === 0) {
    return { splits: [], mode: "fallback", warning: null };
  }

  const quote = parseStoredPriceQuote(data.pricingQuote);
  const donation = quote ? readDonation(quote, data) : null;
  const isPrimaryInvoice =
    doc.kind === "invoice" &&
    (primaryInvoiceNumber == null || doc.documentNumber === primaryInvoiceNumber);

  if (
    isPrimaryInvoice &&
    quote &&
    donation &&
    donation.invoiceTotalCents === doc.totalCents
  ) {
    const splits = ventilateFromQuote(quote, donation);
    const signedSum = splits.reduce((sum, split) => sum + split.signedCents, 0);
    if (signedSum === doc.totalCents) {
      return { splits, mode: "quote", warning: null };
    }
  }

  return ventilateFromLabels(doc, donation);
}
