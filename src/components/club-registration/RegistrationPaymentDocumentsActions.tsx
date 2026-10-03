"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import VerifiedIcon from "@mui/icons-material/Verified";
import type {
  PaymentAidReceiptSummary,
  PaymentInvoiceSummary,
  PaymentReceiptSummary,
} from "@/lib/club-registration/payment-documents/types";
import {
  downloadRegistrationAidReceiptPdf,
  downloadRegistrationCertificatePdf,
  downloadRegistrationInvoicePdf,
  downloadRegistrationPaymentPdf,
  downloadRegistrationUnitReceiptPdf,
} from "@/components/club-registration/download-registration-payment-pdf";
import { formatCentsAsEuros } from "@/lib/pricing/format";

type LoadingKind = string | null;

type Props = {
  registrationId: string;
  invoiceAvailable: boolean;
  situationAvailable: boolean;
  registrationCertificateAvailable?: boolean;
  receipts?: PaymentReceiptSummary[];
  invoices?: PaymentInvoiceSummary[];
  aidReceipts?: PaymentAidReceiptSummary[];
};

function invoiceButtonLabel(invoice: PaymentInvoiceSummary): string {
  const prefix =
    invoice.kind === "credit_note"
      ? "Avoir"
      : invoice.kind === "supplement"
        ? "Fac. compl."
        : "Facture";
  return `${prefix} ${invoice.documentNumber} (${formatCentsAsEuros(Math.abs(invoice.totalCents))})`;
}

export function RegistrationPaymentDocumentsActions({
  registrationId,
  invoiceAvailable,
  situationAvailable,
  registrationCertificateAvailable = false,
  receipts = [],
  invoices = [],
  aidReceipts = [],
}: Props) {
  const [loadingKind, setLoadingKind] = useState<LoadingKind>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInvoices = invoices.length > 0;
  const showLegacyInvoice = invoiceAvailable && !hasInvoices;

  if (
    !invoiceAvailable &&
    !situationAvailable &&
    !registrationCertificateAvailable &&
    receipts.length === 0 &&
    !hasInvoices &&
    aidReceipts.length === 0
  ) {
    return null;
  }

  const run = async (kind: string, action: () => Promise<void>) => {
    setLoadingKind(kind);
    setError(null);
    try {
      await action();
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
        {registrationCertificateAvailable ? (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={
              loadingKind === "certificate" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <VerifiedIcon fontSize="small" />
              )
            }
            disabled={loadingKind != null}
            onClick={() =>
              void run("certificate", () =>
                downloadRegistrationCertificatePdf(registrationId)
              )
            }
          >
            Attestation d&apos;inscription
          </Button>
        ) : null}
        {situationAvailable ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={
              loadingKind === "situation" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AssessmentIcon fontSize="small" />
              )
            }
            disabled={loadingKind != null}
            onClick={() =>
              void run("situation", () =>
                downloadRegistrationPaymentPdf(registrationId, "payment-situation")
              )
            }
          >
            État de situation
          </Button>
        ) : null}
        {invoices.map((invoice) => {
          const key = `invoice:${invoice.id}`;
          return (
            <Button
              key={invoice.id}
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={
                loadingKind === key ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DownloadIcon fontSize="small" />
                )
              }
              disabled={loadingKind != null}
              onClick={() =>
                void run(key, () =>
                  downloadRegistrationInvoicePdf(registrationId, invoice.id)
                )
              }
            >
              {invoiceButtonLabel(invoice)}
            </Button>
          );
        })}
        {showLegacyInvoice ? (
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
            onClick={() =>
              void run("invoice", () =>
                downloadRegistrationPaymentPdf(registrationId, "invoice")
              )
            }
          >
            Facture
          </Button>
        ) : null}
        {receipts.map((receipt) => {
          const key = `receipt:${receipt.id}`;
          return (
            <Button
              key={receipt.id}
              size="small"
              variant="outlined"
              startIcon={
                loadingKind === key ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ReceiptLongIcon fontSize="small" />
                )
              }
              disabled={loadingKind != null}
              onClick={() =>
                void run(key, () =>
                  downloadRegistrationUnitReceiptPdf(registrationId, receipt.id)
                )
              }
            >
              Reçu
              {receipt.documentNumber ? ` ${receipt.documentNumber}` : ""}
              {` (${formatCentsAsEuros(receipt.amountCents)})`}
            </Button>
          );
        })}
        {aidReceipts.map((aid) => {
          const key = `aid:${aid.type}`;
          return (
            <Button
              key={aid.type}
              size="small"
              variant="outlined"
              startIcon={
                loadingKind === key ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CardGiftcardIcon fontSize="small" />
                )
              }
              disabled={loadingKind != null}
              onClick={() =>
                void run(key, () =>
                  downloadRegistrationAidReceiptPdf(registrationId, aid.type)
                )
              }
            >
              Aide
              {aid.documentNumber ? ` ${aid.documentNumber}` : ""}
              {` (${formatCentsAsEuros(aid.amountCents)})`}
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );
}
