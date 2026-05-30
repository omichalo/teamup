"use client";

import { Chip, Stack, Typography } from "@mui/material";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/club-registration/payment-constants";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { formatCentsAsEuros } from "@/lib/pricing";

type Props = {
  payment: RegistrationPayment | null;
};

export function PaymentSummaryCard({ payment }: Props) {
  if (!payment) {
    return (
      <Typography variant="caption" color="text.secondary">
        Paiement non renseigné
      </Typography>
    );
  }

  const hasNote = Boolean(payment.paymentNote || payment.specialPaymentNote);

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        Total {formatCentsAsEuros(payment.totalAmountCents)} · À payer{" "}
        {formatCentsAsEuros(payment.amountToPayCents)} · Reçu{" "}
        {formatCentsAsEuros(payment.paidAmountCents)} · Reste{" "}
        {formatCentsAsEuros(payment.remainingAmountCents)}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="outlined"
          label={PAYMENT_METHOD_LABELS[payment.paymentMethod]}
        />
        {(payment.paymentMethod === "card" || payment.paymentMethod === "cheque") &&
        payment.paymentInstallments > 1 ? (
          <Chip
            size="small"
            variant="outlined"
            label={`${payment.paymentInstallments} fois`}
          />
        ) : null}
        <Chip
          size="small"
          color={
            payment.paymentStatus === "paid"
              ? "success"
              : payment.paymentStatus === "partially_paid"
                ? "warning"
                : payment.paymentStatus === "manual_follow_up"
                  ? "info"
                  : "default"
          }
          label={PAYMENT_STATUS_LABELS[payment.paymentStatus]}
        />
        {hasNote ? (
          <Chip size="small" variant="outlined" label="Note paiement" />
        ) : null}
      </Stack>
    </Stack>
  );
}
