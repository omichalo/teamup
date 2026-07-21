"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { ExpectedPayment } from "@/lib/club-registration/payment/types";
import { MarkExpectedPaymentReceivedDialog } from "@/components/club-registration/secretariat/MarkExpectedPaymentReceivedDialog";
import {
  PAYMENT_METHOD_LABELS,
} from "@/lib/club-registration/payment-constants";
import { formatCentsAsEuros } from "@/lib/pricing";
import { formatPaidLabel } from "@/components/license-validation/license-validation-labels";
import { useLicenseValidationDetail } from "@/components/license-validation/useLicenseValidationDetail";
import { AddManualLicenseValidationPaymentDialog } from "@/components/license-validation/AddManualLicenseValidationPaymentDialog";

type Props = {
  registrationId: string | null;
  onSaved: () => Promise<void>;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function LicenseValidationPaymentDetailPanel({
  registrationId,
  onSaved,
}: Props) {
  const { detail, loading, error, reload } = useLicenseValidationDetail(registrationId);
  const [receiveExpected, setReceiveExpected] = useState<ExpectedPayment | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSuggestedAmountCents, setManualSuggestedAmountCents] = useState(0);

  const pendingChequePayments = useMemo(() => {
    if (!detail?.payment) {
      return [];
    }
    return detail.payment.expectedPayments.filter(
      (expected) =>
        expected.status === "expected" &&
        (expected.method === "cheque" || expected.method === "holiday_vouchers")
    );
  }, [detail?.payment]);

  const postPaymentReceive = async (body: Record<string, unknown>) => {
    if (!registrationId) {
      return;
    }
    setPaymentError(null);
    const res = await fetch(
      `/api/club/license-validations/${encodeURIComponent(registrationId)}/payment/receive`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Paiement impossible");
    }
    await reload();
    await onSaved();
  };

  if (!registrationId) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 280,
          px: 2,
        }}
      >
        <Typography color="text.secondary" textAlign="center">
          Recherchez un adhérent, puis sélectionnez-le pour enregistrer un encaissement.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Chargement du dossier…
      </Typography>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!detail) {
    return null;
  }

  const displayName = [detail.firstName, detail.lastName].filter(Boolean).join(" ");
  const payment = detail.payment;
  const allowedManualMethod:
    | "cheque"
    | "holiday_vouchers"
    | null =
    payment &&
    (payment.paymentMethod === "cheque" ||
      payment.paymentMethod === "holiday_vouchers")
      ? payment.paymentMethod
      : null;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 0.75 }}>
          {displayName || "Adhérent"}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {detail.ffttLicense ? (
            <Chip size="small" label={`Licence ${detail.ffttLicense}`} />
          ) : null}
          <Chip
            size="small"
            variant="outlined"
            label={formatPaidLabel(detail.paymentStatus)}
          />
        </Stack>
      </Box>

      {payment ? (
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" color="text.secondary">
            Situation de paiement
          </Typography>
          <SummaryRow
            label="Moyen choisi"
            value={PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? "—"}
          />
          <SummaryRow
            label="Montant total"
            value={formatCentsAsEuros(payment.totalAmountCents)}
          />
          <SummaryRow
            label="Déjà reçu"
            value={formatCentsAsEuros(payment.paidAmountCents)}
          />
          <SummaryRow
            label="Reste dû"
            value={formatCentsAsEuros(payment.remainingAmountCents)}
          />
        </Stack>
      ) : (
        <Alert severity="warning">Aucune information de paiement sur ce dossier.</Alert>
      )}

      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Enregistrer un encaissement
        </Typography>
        {pendingChequePayments.length > 0 ? (
          pendingChequePayments.map((expected) => (
            <Button
              key={expected.id}
              variant="contained"
              onClick={() => setReceiveExpected(expected)}
            >
              Enregistrer {expected.label} ({formatCentsAsEuros(expected.expectedAmountCents)})
            </Button>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucune échéance chèque ou chèques vacances en attente pour ce dossier.
          </Typography>
        )}
        {paymentError ? <Alert severity="error">{paymentError}</Alert> : null}
      </Stack>

      {payment && allowedManualMethod ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Encaisser le complément (manuel)
          </Typography>
          <Button
            variant="outlined"
            disabled={payment.remainingAmountCents <= 0}
            onClick={() => {
              setManualSuggestedAmountCents(payment.remainingAmountCents);
              setManualOpen(true);
            }}
          >
            Encaisser {formatCentsAsEuros(payment.remainingAmountCents)} —{" "}
            {PAYMENT_METHOD_LABELS[allowedManualMethod]}
          </Button>
        </Stack>
      ) : null}

      <MarkExpectedPaymentReceivedDialog
        open={Boolean(receiveExpected)}
        expected={receiveExpected}
        onClose={() => setReceiveExpected(null)}
        onSubmit={async (input) => {
          if (!receiveExpected) {
            return;
          }
          try {
            await postPaymentReceive({
              mode: "expected",
              expectedId: receiveExpected.id,
              amountCents: input.amountCents,
              receivedAt: input.receivedAt,
              ...(input.reference ? { reference: input.reference } : {}),
              ...(input.note ? { note: input.note } : {}),
            });
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Erreur inconnue");
            throw err;
          }
        }}
      />

      {payment && allowedManualMethod ? (
        <AddManualLicenseValidationPaymentDialog
          open={manualOpen}
          method={allowedManualMethod}
          suggestedAmountCents={manualSuggestedAmountCents}
          onClose={() => setManualOpen(false)}
          onSubmit={async (input) => {
            await postPaymentReceive({
              mode: "manual",
              method: allowedManualMethod,
              label: PAYMENT_METHOD_LABELS[allowedManualMethod],
              amountCents: input.amountCents,
              receivedAt: input.receivedAt,
              ...(input.reference ? { reference: input.reference } : {}),
              ...(input.note ? { note: input.note } : {}),
            });
          }}
        />
      ) : null}
    </Stack>
  );
}
