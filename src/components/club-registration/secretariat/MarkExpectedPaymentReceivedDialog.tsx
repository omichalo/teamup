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
} from "@mui/material";
import type { ExpectedPayment } from "@/lib/club-registration/payment/types";
import {
  centsToEurosInput,
  eurosInputToCents,
} from "@/lib/club-registration/payment/payment-draft-helpers";

type Props = {
  open: boolean;
  expected: ExpectedPayment | null;
  onClose: () => void;
  onSubmit: (input: {
    amountCents: number;
    receivedAt: string;
    note?: string;
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
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expected) {
      setAmountEuros(centsToEurosInput(expected.expectedAmountCents));
      setReceivedAt(new Date().toISOString().slice(0, 10));
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
