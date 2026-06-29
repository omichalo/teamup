import { useMemo } from "react";
import { TableCell, TableRow } from "@mui/material";
import { formatCentsAsEuros } from "@/lib/pricing";
import {
  resolveDonationPricing,
  type DonationPricingBreakdown,
} from "@/lib/pricing/donation-discount";
import type { PriceQuote } from "@/lib/pricing/types";
import type { PricingBreakdownDraft } from "./PricingBreakdown";

export function useDonationPricing(
  quote: PriceQuote | null,
  draft: PricingBreakdownDraft
): DonationPricingBreakdown | null {
  return useMemo(() => {
    if (!quote) {
      return null;
    }
    const donationCents = draft.voluntaryDonationCents ?? 0;
    if (donationCents <= 0) {
      return null;
    }
    return resolveDonationPricing(quote, donationCents);
  }, [quote, draft.voluntaryDonationCents]);
}

export function useEstimatedInvoiceTotalCents(
  quote: PriceQuote | null,
  draft: PricingBreakdownDraft
): number | null {
  return useMemo(() => {
    if (!quote) {
      return null;
    }
    const donationCents = draft.voluntaryDonationCents ?? 0;
    if (donationCents <= 0) {
      return quote.totalCents;
    }
    return resolveDonationPricing(quote, donationCents).invoiceTotalCents;
  }, [quote, draft.voluntaryDonationCents]);
}

type DonationRowsProps = {
  donationPricing: DonationPricingBreakdown;
  cellSx: Record<string, unknown>;
};

export function PricingBreakdownDonationRows({
  donationPricing,
  cellSx,
}: DonationRowsProps) {
  return (
    <>
      <TableRow>
        <TableCell sx={{ ...cellSx, pl: 0, pt: 0.5 }}>Don libre au club</TableCell>
        <TableCell align="right" sx={{ ...cellSx, pr: 0, pt: 0.5, whiteSpace: "nowrap" }}>
          {formatCentsAsEuros(donationPricing.voluntaryDonationCents)}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ ...cellSx, pl: 0 }}>Remise don 25 % (plaf. 73 €)</TableCell>
        <TableCell
          align="right"
          sx={{
            ...cellSx,
            pr: 0,
            whiteSpace: "nowrap",
            fontWeight: 600,
            color: "success.dark",
          }}
        >
          {formatCentsAsEuros(-donationPricing.donationDiscountCents)}
        </TableCell>
      </TableRow>
    </>
  );
}
