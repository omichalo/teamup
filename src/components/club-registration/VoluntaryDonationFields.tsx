"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import {
  VOLUNTARY_DONATION_MIN_CENTS,
  computeDonationDiscountCents,
  formatCentsAsEuros,
  getMembershipNetCents,
} from "@/lib/pricing";
import type { PriceQuote } from "@/lib/pricing/types";
import { EuroMonetaryInputField } from "./EuroMonetaryInputField";

type Props = {
  quote: PriceQuote | null;
  voluntaryDonationCents: number;
  onChange: (voluntaryDonationCents: number) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function VoluntaryDonationFields({
  quote,
  voluntaryDonationCents,
  onChange,
  disabled = false,
  idPrefix = "donation",
}: Props) {
  const wantsDonation = voluntaryDonationCents > 0;
  const [draftDonationCents, setDraftDonationCents] = useState(voluntaryDonationCents);

  useEffect(() => {
    setDraftDonationCents(voluntaryDonationCents);
  }, [voluntaryDonationCents]);

  const previewCents = wantsDonation ? draftDonationCents || voluntaryDonationCents : 0;

  const preview = (() => {
    if (!quote || !wantsDonation || previewCents <= 0) {
      return null;
    }
    const membershipNet = getMembershipNetCents(quote);
    const discount = computeDonationDiscountCents(previewCents, membershipNet);
    return {
      discount,
      total: quote.totalCents + previewCents - discount,
    };
  })();

  const toggleDonation = (checked: boolean) => {
    if (!checked) {
      setDraftDonationCents(0);
      onChange(0);
      return;
    }
    setDraftDonationCents(VOLUNTARY_DONATION_MIN_CENTS);
    onChange(VOLUNTARY_DONATION_MIN_CENTS);
  };

  const commitDonation = (cents: number) => {
    const next = cents > 0 ? Math.max(cents, VOLUNTARY_DONATION_MIN_CENTS) : VOLUNTARY_DONATION_MIN_CENTS;
    setDraftDonationCents(next);
    onChange(next);
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        Don libre au club
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Vous pouvez soutenir le club par un don libre. Une remise de 25 % de ce don
        sera appliquée sur le montant de l&apos;adhésion, dans la limite de 73 €.
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={wantsDonation}
            disabled={disabled}
            onChange={(e) => toggleDonation(e.target.checked)}
          />
        }
        label="Je souhaite faire un don libre au club"
      />
      {wantsDonation ? (
        <EuroMonetaryInputField
          id={`${idPrefix}-amount`}
          label="Montant du don"
          amountCents={voluntaryDonationCents}
          onCommitCents={commitDonation}
          onDraftCents={setDraftDonationCents}
          minCentsOnBlur={VOLUNTARY_DONATION_MIN_CENTS}
          fullWidth
          disabled={disabled}
          dataField="voluntaryDonationCents"
          helperText={`Minimum ${formatCentsAsEuros(VOLUNTARY_DONATION_MIN_CENTS)}`}
          endAdornment="€"
        />
      ) : null}
      {preview ? (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Don : <strong>{formatCentsAsEuros(previewCents)}</strong>
            </Typography>
            <Typography variant="body2">
              Remise 25 % (plaf. 73 €) :{" "}
              <strong>−{formatCentsAsEuros(preview.discount)}</strong>
            </Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              Total avec don : {formatCentsAsEuros(preview.total)}
            </Typography>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
