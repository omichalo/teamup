"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Alert,
  Stack,
  Typography,
} from "@mui/material";
import type { ExpectedPayment } from "@/lib/club-registration/payment/types";
import {
  centsToEurosInput,
  eurosInputToCents,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import {
  PAYMENT_REFERENCE_MAX_LENGTH,
  paymentReferenceFieldLabel,
} from "@/lib/club-registration/payment/payment-reference";

type Props = {
  open: boolean;
  expected: ExpectedPayment | null;
  onClose: () => void;
  onSubmit: (input: {
    amountCents: number;
    receivedAt: string;
    note?: string;
    reference?: string;
  }) => Promise<void>;
};

export function MarkExpectedPaymentReceivedDialog({
  open,
  expected,
  onClose,
  onSubmit,
}: Props) {
  const [amountEuros, setAmountEuros] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expectedEuros = expected
    ? centsToEurosInput(expected.expectedAmountCents)
    : "";
  const expectedCents = expected?.expectedAmountCents ?? 0;
  const receivedCentsPreview = eurosInputToCents(amountEuros);
  const diffCentsPreview = receivedCentsPreview - expectedCents;
  const hasMismatchPreview =
    expected && receivedCentsPreview > 0 && diffCentsPreview !== 0;
  const showReferenceField =
    expected?.method === "cheque" || expected?.method === "holiday_vouchers";

  useEffect(() => {
    if (expected) {
      setAmountEuros(centsToEurosInput(expected.expectedAmountCents));
      setReceivedAt(new Date().toISOString().slice(0, 10));
      setReference("");
      setNote("");
    }
  }, [expected]);

  const handleSubmit = async () => {
    if (!expected) return;
    const amountCents = eurosInputToCents(amountEuros);
    if (amountCents <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        amountCents,
        receivedAt: new Date(receivedAt).toISOString(),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Marquer comme reçu — {expected?.label ?? ""}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1 }}>
          Confirmez le montant et la date réels de réception pour cette ligne du plan de
          paiement.
        </DialogContentText>
        {expected ? (
          <Stack spacing={1} sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Montant attendu : <strong>{expectedEuros}</strong> €
            </Typography>
            {hasMismatchPreview ? (
              <Alert severity="warning">
                Montant reçu différent (reçu :{" "}
                <strong>{centsToEurosInput(receivedCentsPreview)}</strong> € · attendu :{" "}
                <strong>{expectedEuros}</strong> €). Le solde sera recalculé.
              </Alert>
            ) : null}
          </Stack>
        ) : null}
        <TextField
          label="Montant reçu (€)"
          value={amountEuros}
          onChange={(e) => setAmountEuros(e.target.value)}
          fullWidth
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="Date de réception"
          type="date"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        {showReferenceField ? (
          <TextField
            label={paymentReferenceFieldLabel(expected?.method)}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            inputProps={{ maxLength: PAYMENT_REFERENCE_MAX_LENGTH }}
            helperText="Facultatif — utile pour le suivi comptable."
          />
        ) : null}
        <TextField
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
