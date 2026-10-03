"use client";

import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import type { MemberLedgerView } from "@/lib/member-ledger/types";
import type { PaymentDocumentsAvailability } from "@/lib/club-registration/payment-documents/types";
import { RECEIVED_PAYMENT_METHOD_LABELS } from "@/lib/club-registration/payment-constants";
import { RegistrationPaymentDocumentsActions } from "@/components/club-registration/RegistrationPaymentDocumentsActions";
import { MemberProfileSection } from "./MemberProfileSection";
import { MemberProfileMetric } from "./MemberProfileMetric";

const CHARGE_STATUS_LABELS: Record<string, string> = {
  open: "Ouverte",
  partially_paid: "Partielle",
  paid: "Soldée",
  voided: "Annulée",
};

const CHARGE_STATUS_COLOR: Record<
  string,
  "default" | "warning" | "success" | "error"
> = {
  open: "default",
  partially_paid: "warning",
  paid: "success",
  voided: "error",
};

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function methodLabel(method: string): string {
  if (method === "aid") return "Aide";
  if (method in RECEIVED_PAYMENT_METHOD_LABELS) {
    return RECEIVED_PAYMENT_METHOD_LABELS[
      method as keyof typeof RECEIVED_PAYMENT_METHOD_LABELS
    ];
  }
  return method;
}

type Props = {
  finance: MemberLedgerView;
  documents: PaymentDocumentsAvailability;
  registrationId: string;
};

export function MemberFinanceSection({ finance, documents, registrationId }: Props) {
  const balanceTone =
    finance.totals.balanceCents <= 0
      ? "success"
      : finance.totals.receivedCents > 0
        ? "warning"
        : "default";

  return (
    <MemberProfileSection
      title="Finances"
      subtitle="Charges, encaissements, aides et justificatifs"
      icon={AccountBalanceWalletIcon}
    >
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
          <MemberProfileMetric
            label="Facturé"
            value={formatEuros(finance.totals.invoicedCents)}
          />
          <MemberProfileMetric
            label="Encaissé"
            value={formatEuros(finance.totals.receivedCents)}
            tone={finance.totals.receivedCents > 0 ? "success" : "muted"}
          />
          <MemberProfileMetric
            label="Solde"
            value={formatEuros(finance.totals.balanceCents)}
            emphasize
            tone={balanceTone}
          />
        </Stack>

        {finance.charges.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Charges
            </Typography>
            <TableContainer
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(40, 48, 109, 0.03)" }}>
                    <TableCell>Libellé</TableCell>
                    <TableCell>N°</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {finance.charges.map((charge) => (
                    <TableRow key={charge.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {charge.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "ui-monospace, monospace" }}
                        >
                          {charge.documentNumber ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatEuros(charge.amountCents)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CHARGE_STATUS_LABELS[charge.status] ?? charge.status}
                          color={CHARGE_STATUS_COLOR[charge.status] ?? "default"}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucune charge d&apos;adhésion pour le moment.
          </Typography>
        )}

        {finance.payments.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Encaissements &amp; aides
            </Typography>
            <TableContainer
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(40, 48, 109, 0.03)" }}>
                    <TableCell>Date</TableCell>
                    <TableCell>N°</TableCell>
                    <TableCell>Libellé</TableCell>
                    <TableCell>Moyen</TableCell>
                    <TableCell align="right">Montant</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {finance.payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      hover
                      {...(payment.reversedAt
                        ? {
                            sx: {
                              opacity: 0.55,
                              textDecoration: "line-through",
                            },
                          }
                        : {})}
                    >
                      <TableCell>
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "ui-monospace, monospace" }}
                        >
                          {payment.documentNumber ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {payment.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={methodLabel(payment.method)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatEuros(payment.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        <Box
          sx={{
            pt: 0.5,
            borderTop: "1px dashed",
            borderColor: "divider",
          }}
        >
          <RegistrationPaymentDocumentsActions
            registrationId={registrationId}
            invoiceAvailable={documents.invoiceAvailable}
            situationAvailable={documents.situationAvailable}
            registrationCertificateAvailable={
              documents.registrationCertificateAvailable
            }
            receipts={documents.receipts}
            invoices={documents.invoices}
            aidReceipts={documents.aidReceipts}
          />
        </Box>
      </Stack>
    </MemberProfileSection>
  );
}
