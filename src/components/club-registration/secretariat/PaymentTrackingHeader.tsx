"use client";

import { Alert, Box, Typography } from "@mui/material";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { RegistrationPaymentDocumentsActions } from "@/components/club-registration/RegistrationPaymentDocumentsActions";

type SummaryRow = { label: string; value: string };

type Props = {
  registrationId: string;
  payment: RegistrationPayment;
  summaryRows: SummaryRow[];
  actionError: string | null;
  onClearError: () => void;
};

export function PaymentTrackingHeader({
  registrationId,
  payment,
  summaryRows,
  actionError,
  onClearError,
}: Props) {
  return (
    <>
      <Typography variant="subtitle1" fontWeight={700}>
        Suivi du paiement
      </Typography>

      {actionError ? (
        <Alert severity="error" onClose={onClearError}>
          {actionError}
        </Alert>
      ) : null}

      <Alert severity="info" variant="outlined">
        <Typography variant="body2" component="div">
          Ici vous <strong>noter ce qui est réellement encaissé</strong> (chèque, virement,
          espèces, prélèvement externe…). Survolez chaque bouton ou lien « Marquer reçu » pour
          une courte explication.
        </Typography>
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1,
        }}
      >
        {summaryRows.map((row) => (
          <Typography key={row.label} variant="body2">
            <strong>{row.label} :</strong> {row.value}
          </Typography>
        ))}
      </Box>

      <RegistrationPaymentDocumentsActions
        registrationId={registrationId}
        invoiceAvailable={
          (payment.amountToPayCents > 0 || payment.totalAmountCents > 0) &&
          (payment.paidAmountCents > 0 ||
            payment.paymentStatus === "paid" ||
            payment.paymentStatus === "partially_paid")
        }
        receiptAvailable={
          payment.paidAmountCents > 0 &&
          payment.receivedPayments.some((line) => !line.reversedAt && line.amountCents > 0)
        }
        receiptPartial={payment.remainingAmountCents > 0 && payment.paidAmountCents > 0}
      />
    </>
  );
}
