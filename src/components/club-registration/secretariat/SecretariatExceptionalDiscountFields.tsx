"use client";

import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { PAYMENT_AID_NOTE_MAX_LENGTH } from "@/lib/club-registration/payment-constants";
import {
  EXCEPTIONAL_DISCOUNT_AID_LABEL,
  findExceptionalDiscountAid,
  removeExceptionalDiscountAid,
  upsertExceptionalDiscountAid,
} from "@/lib/club-registration/payment/exceptional-discount";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { AidEuroAmountField } from "../AidEuroAmountField";

type Props = {
  paymentAids: PaymentAid[];
  onPaymentAidsChange: (aids: PaymentAid[]) => void;
};

const AMOUNT_FIELD_SX = {
  width: "100%",
  maxWidth: 220,
} as const;

export function SecretariatExceptionalDiscountFields({
  paymentAids,
  onPaymentAidsChange,
}: Props) {
  const normalizedAids = normalizePaymentAidList(paymentAids);
  const exceptional = findExceptionalDiscountAid(normalizedAids);
  const amountCents = exceptional?.amountCents ?? 0;
  const note = exceptional?.note ?? "";
  const isActive = amountCents > 0 || Boolean(note.trim());

  const commit = (next: { amountCents: number; note: string }) => {
    if (next.amountCents <= 0 && !next.note.trim()) {
      onPaymentAidsChange(removeExceptionalDiscountAid(normalizedAids));
      return;
    }
    onPaymentAidsChange(
      upsertExceptionalDiscountAid(
        normalizedAids,
        {
          amountCents: next.amountCents,
          note: next.note,
        },
        { retainZero: true }
      )
    );
  };

  return (
    <Box sx={{ gridColumn: "1 / -1" }} data-field="paymentAid.other">
      <Stack spacing={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          {EXCEPTIONAL_DISCOUNT_AID_LABEL}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Remise secrétariat à montant libre, déduite du reste à payer. Indiquez le motif lorsque
          un montant est saisi.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
          <AidEuroAmountField
            label="Montant de la remise"
            amountCents={amountCents}
            onCommitCents={(cents) => commit({ amountCents: cents, note })}
            sx={AMOUNT_FIELD_SX}
            dataField="paymentAid.other.amount"
            helperText="Montant libre (0 € pour retirer la remise)."
          />
          {isActive ? (
            <Button
              color="inherit"
              onClick={() => onPaymentAidsChange(removeExceptionalDiscountAid(normalizedAids))}
              sx={{ mt: { sm: 0.5 } }}
            >
              Retirer
            </Button>
          ) : null}
        </Stack>
        <TextField
          label="Motif de la remise"
          value={note}
          onChange={(e) => commit({ amountCents, note: e.target.value })}
          onBlur={() => {
            const trimmed = note.trim();
            if (trimmed !== note) {
              commit({ amountCents, note: trimmed });
            }
          }}
          fullWidth
          multiline
          minRows={2}
          required={amountCents > 0}
          inputProps={{
            maxLength: PAYMENT_AID_NOTE_MAX_LENGTH,
            "data-field": "paymentAid.other.note",
          }}
          helperText={
            amountCents > 0
              ? "Obligatoire dès qu’un montant est saisi (ex. geste commercial, cas social)."
              : "Facultatif tant qu’aucun montant n’est saisi."
          }
        />
      </Stack>
    </Box>
  );
}
