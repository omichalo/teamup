"use client";

import { Stack, Typography } from "@mui/material";
import { formatCentsAsEuros } from "@/lib/pricing";
import { resolveDonationPricing } from "@/lib/pricing/donation-discount";
import type { PriceQuote } from "@/lib/pricing/types";
import { VoluntaryDonationFields } from "../VoluntaryDonationFields";
import { formatRegistrationDate } from "./membership-request-detail-shared";

type Props = {
  liveQuote: PriceQuote | null;
  voluntaryDonationCents: number;
  pricingQuoteComputedAt?: string | null | undefined;
  onDonationChange: (voluntaryDonationCents: number) => void;
};

export function MembershipRequestDonationSection({
  liveQuote,
  voluntaryDonationCents,
  pricingQuoteComputedAt,
  onDonationChange,
}: Props) {
  return (
    <Stack spacing={2}>
      <VoluntaryDonationFields
        quote={liveQuote}
        voluntaryDonationCents={voluntaryDonationCents}
        onChange={onDonationChange}
      />
      {liveQuote && liveQuote.totalCents > 0 ? (
        <Typography variant="body2" color="text.secondary">
          Total catalogue : <strong>{formatCentsAsEuros(liveQuote.totalCents)}</strong>
          {voluntaryDonationCents > 0 ? (
            <>
              {" "}
              — avec don :{" "}
              <strong>
                {formatCentsAsEuros(
                  resolveDonationPricing(liveQuote, voluntaryDonationCents).invoiceTotalCents
                )}
              </strong>
            </>
          ) : null}
          {pricingQuoteComputedAt
            ? ` — dernier devis serveur : ${formatRegistrationDate(pricingQuoteComputedAt)}`
            : null}
        </Typography>
      ) : null}
    </Stack>
  );
}
