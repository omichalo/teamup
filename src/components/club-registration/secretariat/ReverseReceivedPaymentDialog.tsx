"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { ReceivedPayment } from "@/lib/club-registration/payment/types";
import { formatCentsAsEuros } from "@/lib/pricing";

type Props = {
  open: boolean;
  payment: ReceivedPayment | null;
  onClose: () => void;
  onSubmit: (input: { reason: string }) => Promise<void>;
};

export function ReverseReceivedPaymentDialog({
  open,
  payment,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open, payment?.id]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Indiquez un motif d'annulation.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ reason: trimmed });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Annuler cet encaissement</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {payment ? (
            <>
              Vous allez annuler l&apos;encaissement « {payment.label} » de{" "}
              {formatCentsAsEuros(payment.amountCents)}. Le solde du dossier sera recalculé.
            </>
          ) : null}
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          required
          multiline
          minRows={2}
          label="Motif d'annulation"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={submitting}
          placeholder="Ex. : erreur de saisie, chèque refusé…"
        />
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Fermer
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || !reason.trim()}
        >
          Annuler l&apos;encaissement
        </Button>
      </DialogActions>
    </Dialog>
  );
}
