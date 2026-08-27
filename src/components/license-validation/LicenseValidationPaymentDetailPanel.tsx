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
import type { ExpectedPayment, ReceivedPayment } from "@/lib/club-registration/payment/types";
import { MarkExpectedPaymentReceivedDialog } from "@/components/club-registration/secretariat/MarkExpectedPaymentReceivedDialog";
import { AddManualPaymentDialog } from "@/components/club-registration/secretariat/AddManualPaymentDialog";
import { ReceivedPaymentsTable } from "@/components/club-registration/secretariat/ReceivedPaymentsTable";
import { ReverseReceivedPaymentDialog } from "@/components/club-registration/secretariat/ReverseReceivedPaymentDialog";
import {
  PAYMENT_METHOD_LABELS,
  RECEIVED_PAYMENT_METHOD_LABELS,
} from "@/lib/club-registration/payment-constants";
import { wouldCreateOverpayment } from "@/lib/club-registration/payment/overpayment";
import { formatCentsAsEuros } from "@/lib/pricing";
import { formatPaidLabel } from "@/components/license-validation/license-validation-labels";
import { useLicenseValidationDetail } from "@/components/license-validation/useLicenseValidationDetail";

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
  const [reverseReceived, setReverseReceived] = useState<ReceivedPayment | null>(null);

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
  };

  const refreshAfterPayment = async () => {
    await reload({ silent: true });
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

  if (loading && !detail) {
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
          {payment.paidAmountCents > payment.amountToPayCents ? (
            <Alert severity="info">
              Trop-perçu enregistré :{" "}
              {formatCentsAsEuros(payment.paidAmountCents - payment.amountToPayCents)}.
            </Alert>
          ) : null}
        </Stack>
      ) : (
        <Alert severity="warning">Aucune information de paiement sur ce dossier.</Alert>
      )}

      {payment && payment.receivedPayments.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Encaissements enregistrés
          </Typography>
          <ReceivedPaymentsTable
            receivedPayments={payment.receivedPayments}
            onReverse={(line) => setReverseReceived(line)}
          />
        </Stack>
      ) : null}

      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Échéances en attente
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
      </Stack>

      {payment ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Enregistrer un encaissement
          </Typography>
          <Button variant="outlined" onClick={() => setManualOpen(true)}>
            {payment.remainingAmountCents > 0
              ? `Ajouter un paiement (reste ${formatCentsAsEuros(payment.remainingAmountCents)})`
              : "Ajouter un paiement (solde déjà à zéro)"}
          </Button>
        </Stack>
      ) : null}

      {paymentError ? <Alert severity="error">{paymentError}</Alert> : null}

      <MarkExpectedPaymentReceivedDialog
        open={Boolean(receiveExpected)}
        expected={receiveExpected}
        onClose={() => setReceiveExpected(null)}
        onSubmit={async (input) => {
          if (!receiveExpected || !payment) {
            return;
          }
          const overpayment = wouldCreateOverpayment(
            payment.remainingAmountCents,
            input.amountCents
          );
          if (
            overpayment &&
            !window.confirm(
              `Ce montant dépasse le reste dû (${formatCentsAsEuros(payment.remainingAmountCents)}). Confirmer le trop-perçu ?`
            )
          ) {
            throw new Error("Trop-perçu non confirmé");
          }
          try {
            await postPaymentReceive({
              mode: "expected",
              expectedId: receiveExpected.id,
              amountCents: input.amountCents,
              receivedAt: input.receivedAt,
              ...(overpayment ? { confirmOverpayment: true } : {}),
              ...(input.reference ? { reference: input.reference } : {}),
              ...(input.note ? { note: input.note } : {}),
            });
            setReceiveExpected(null);
            await refreshAfterPayment();
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Erreur inconnue");
            throw err;
          }
        }}
      />

      {payment ? (
        <AddManualPaymentDialog
          open={manualOpen}
          suggestedAmountCents={payment.remainingAmountCents}
          remainingAmountCents={payment.remainingAmountCents}
          onClose={() => setManualOpen(false)}
          onSubmit={async (input) => {
            try {
              await postPaymentReceive({
                mode: "manual",
                method: input.method,
                label: input.label || RECEIVED_PAYMENT_METHOD_LABELS[input.method],
                amountCents: input.amountCents,
                receivedAt: input.receivedAt,
                ...(input.confirmOverpayment ? { confirmOverpayment: true } : {}),
                ...(input.reference ? { reference: input.reference } : {}),
                ...(input.note ? { note: input.note } : {}),
              });
              setManualOpen(false);
              await refreshAfterPayment();
            } catch (err) {
              setPaymentError(err instanceof Error ? err.message : "Erreur inconnue");
              throw err;
            }
          }}
        />
      ) : null}

      <ReverseReceivedPaymentDialog
        open={reverseReceived !== null}
        payment={reverseReceived}
        onClose={() => setReverseReceived(null)}
        onSubmit={async ({ reason }) => {
          if (!reverseReceived || !registrationId) {
            return;
          }
          setPaymentError(null);
          const receivedId = reverseReceived.id;
          const res = await fetch(
            `/api/club/license-validations/${encodeURIComponent(registrationId)}/payment/received/${encodeURIComponent(receivedId)}/reverse`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            }
          );
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(json.error || "Annulation impossible");
          }
          setReverseReceived(null);
          await refreshAfterPayment();
        }}
      />
    </Stack>
  );
}
