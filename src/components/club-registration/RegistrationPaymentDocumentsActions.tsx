"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { downloadRegistrationPaymentPdf } from "@/components/club-registration/download-registration-payment-pdf";

type Props = {
  registrationId: string;
  invoiceAvailable: boolean;
  receiptAvailable: boolean;
  receiptPartial?: boolean;
};

export function RegistrationPaymentDocumentsActions({
  registrationId,
  invoiceAvailable,
  receiptAvailable,
  receiptPartial = false,
}: Props) {
  const [loadingKind, setLoadingKind] = useState<"invoice" | "payment-receipt" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  if (!invoiceAvailable && !receiptAvailable) {
    return null;
  }

  const runDownload = async (kind: "invoice" | "payment-receipt") => {
    setLoadingKind(kind);
    setError(null);
    try {
      await downloadRegistrationPaymentPdf(registrationId, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setLoadingKind(null);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Justificatifs
      </Typography>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
        {receiptAvailable ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={
              loadingKind === "payment-receipt" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ReceiptLongIcon fontSize="small" />
              )
            }
            disabled={loadingKind != null}
            onClick={() => void runDownload("payment-receipt")}
          >
            {receiptPartial ? "Télécharger le reçu (partiel)" : "Télécharger le reçu"}
          </Button>
        ) : null}
        {invoiceAvailable ? (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={
              loadingKind === "invoice" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DownloadIcon fontSize="small" />
              )
            }
            disabled={loadingKind != null}
            onClick={() => void runDownload("invoice")}
          >
            Télécharger la facture
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
