"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REMAINING_PAYMENT_METHOD_LABELS,
} from "@/lib/club-registration/payment-constants";
import { receivedMethodFromPlanned } from "@/lib/club-registration/payment/received-method-from-planned";
import type { ExpectedPayment, RegistrationPayment } from "@/lib/club-registration/payment/types";
import { formatCentsAsEuros } from "@/lib/pricing";
import { AddManualPaymentDialog } from "./AddManualPaymentDialog";
import { MarkExpectedPaymentReceivedDialog } from "./MarkExpectedPaymentReceivedDialog";
import { PaymentDeclaredAidsTable } from "./PaymentDeclaredAidsTable";

type Props = {
  registrationId: string;
  payment: RegistrationPayment;
  onRefresh: () => Promise<void>;
  onAidsChange: (aids: RegistrationPayment["aids"]) => void;
};

async function postPaymentAction(
  registrationId: string,
  path: string,
  body?: Record<string, unknown>
) {
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/payment${path}`,
    init
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error || "Action impossible");
  }
}

export function PaymentTrackingSection({
  registrationId,
  payment,
  onRefresh,
  onAidsChange,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false);
  const [receiveExpected, setReceiveExpected] = useState<ExpectedPayment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const summaryRows = useMemo(
    () => [
      { label: "Montant total", value: formatCentsAsEuros(payment.totalAmountCents) },
      {
        label: "Aides déduites",
        value: formatCentsAsEuros(payment.assistanceTotalAmountCents),
      },
      {
        label: "Montant à régler",
        value: formatCentsAsEuros(payment.amountToPayCents),
      },
      { label: "Montant encaissé", value: formatCentsAsEuros(payment.paidAmountCents) },
      { label: "Solde restant", value: formatCentsAsEuros(payment.remainingAmountCents) },
      {
        label: "Statut",
        value: PAYMENT_STATUS_LABELS[payment.paymentStatus],
      },
      {
        label: "Mode prévu",
        value: PAYMENT_METHOD_LABELS[payment.paymentMethod],
      },
      ...(payment.paymentMethod === "cheque"
        ? [{ label: "Nombre de fois", value: String(payment.paymentInstallments) }]
        : []),
    ],
    [payment]
  );

  const runAction = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" fontWeight={700}>
        Suivi du paiement
      </Typography>

      {actionError ? (
        <Alert severity="error" onClose={() => setActionError(null)}>
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

      {payment.paymentNote ? (
        <Alert severity="info" variant="outlined">
          <strong>Message adhérent :</strong> {payment.paymentNote}
        </Alert>
      ) : null}
      {payment.specialPaymentNote ? (
        <Alert severity="warning" variant="outlined">
          <strong>Cas particulier :</strong> {payment.specialPaymentNote}
        </Alert>
      ) : null}
      {payment.holidayVoucherAmountCents ? (
        <Typography variant="body2" color="text.secondary">
          Chèques vacances prévus :{" "}
          {formatCentsAsEuros(payment.holidayVoucherAmountCents)}
          {payment.remainingPaymentMethod
            ? ` — complément : ${REMAINING_PAYMENT_METHOD_LABELS[payment.remainingPaymentMethod]}`
            : ""}
        </Typography>
      ) : null}

      {payment.aids.length > 0 ? (
        <PaymentDeclaredAidsTable
          registrationId={registrationId}
          aids={payment.aids}
          onAidsChange={onAidsChange}
        />
      ) : null}

      {payment.expectedPayments.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={600}>
            Règlement prévu
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Libellé</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payment.expectedPayments.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.label}</TableCell>
                  <TableCell align="right">
                    {formatCentsAsEuros(line.expectedAmountCents)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        line.status === "received"
                          ? "Reçu"
                          : line.status === "cancelled"
                            ? "Annulé"
                            : "Attendu"
                      }
                      color={
                        line.status === "received"
                          ? "success"
                          : line.status === "cancelled"
                            ? "default"
                            : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    {line.status === "expected" ? (
                      <Tooltip
                        title="À utiliser dès que cette échéance est bien arrivée sur le compte du club (hors lien de paiement envoyé par l’application, si vous n’en utilisez pas)."
                        slotProps={{ popper: { sx: { maxWidth: 320 } } }}
                        enterDelay={400}
                      >
                        <Button
                          size="small"
                          onClick={() => setReceiveExpected(line)}
                        >
                          Marquer reçu
                        </Button>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}

      {payment.receivedPayments.length > 0 ? (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={600}>
            Encaissements reçus
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Libellé</TableCell>
                <TableCell>N° / réf.</TableCell>
                <TableCell align="right">Montant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payment.receivedPayments.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {new Date(line.receivedAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{line.label}</TableCell>
                  <TableCell>{line.reference?.trim() || "—"}</TableCell>
                  <TableCell align="right">
                    {formatCentsAsEuros(line.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
        <Tooltip
          title="Pour un encaissement qui ne correspond pas exactement aux lignes du tableau (montant ou libellé libres)."
          slotProps={{ popper: { sx: { maxWidth: 300 } } }}
          enterDelay={400}
        >
          <Button variant="outlined" onClick={() => setManualOpen(true)}>
            Ajouter un paiement reçu
          </Button>
        </Tooltip>
        <Tooltip
          title="Ouvre le formulaire d’encaissement, prérempli avec le solde restant. Choisissez le moyen réellement reçu."
          slotProps={{ popper: { sx: { maxWidth: 300 } } }}
          enterDelay={400}
        >
          <Button
            variant="outlined"
            color="success"
            onClick={() => setManualOpen(true)}
          >
            Tout est payé
          </Button>
        </Tooltip>
        <Tooltip
          title="Indique que le bureau gère les relances et les encaissements sans s’appuyer sur un lien de paiement envoyé automatiquement par l’application. Le statut du dossier devient « Suivi au secrétariat »."
          slotProps={{ popper: { sx: { maxWidth: 340 } } }}
          enterDelay={400}
        >
          <Button
            variant="outlined"
            color="info"
            onClick={() =>
              void runAction(() =>
                postPaymentAction(registrationId, "/manual-follow-up")
              )
            }
          >
            Suivi au bureau (sans lien automatique)
          </Button>
        </Tooltip>
      </Stack>

      <AddManualPaymentDialog
        open={manualOpen}
        suggestedAmountCents={payment.remainingAmountCents}
        remainingAmountCents={payment.remainingAmountCents}
        defaultMethod={receivedMethodFromPlanned(payment.paymentMethod)}
        onClose={() => setManualOpen(false)}
        onSubmit={async (input) => {
          await runAction(() =>
            postPaymentAction(registrationId, "/received", input)
          );
        }}
      />

      <MarkExpectedPaymentReceivedDialog
        open={receiveExpected !== null}
        expected={receiveExpected}
        onClose={() => setReceiveExpected(null)}
        onSubmit={async (input) => {
          if (!receiveExpected) return;
          await runAction(() =>
            postPaymentAction(
              registrationId,
              `/expected/${encodeURIComponent(receiveExpected.id)}/receive`,
              input
            )
          );
        }}
      />
    </Stack>
  );
}
