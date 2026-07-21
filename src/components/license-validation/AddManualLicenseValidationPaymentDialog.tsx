"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { PAYMENT_METHOD_LABELS } from "@/lib/club-registration/payment-constants";
import {
  centsToEurosInput,
  eurosInputToCents,
} from "@/lib/club-registration/payment/payment-draft-helpers";
import {
  PAYMENT_REFERENCE_MAX_LENGTH,
  paymentReferenceFieldLabel,
} from "@/lib/club-registration/payment/payment-reference";

type ManualPaymentMethod = "cheque" | "holiday_vouchers";

type Props = {
  open: boolean;
  method: ManualPaymentMethod;
  suggestedAmountCents: number;
  onClose: () => void;
  onSubmit: (input: {
    amountCents: number;
    receivedAt: string;
    note?: string;
    reference?: string;
  }) => Promise<void>;
};

export function AddManualLicenseValidationPaymentDialog({
  open,
  method,
  suggestedAmountCents,
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
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmountEuros(centsToEurosInput(suggestedAmountCents));
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setReference("");
    setNote("");
    setAmountError(null);
  }, [open, suggestedAmountCents]);

  const handleSubmit = async () => {
    const amountCents = eurosInputToCents(amountEuros);
    if (amountCents <= 0) {
      setAmountError("Le montant doit être > 0.");
      return;
    }

    setSubmitting(true);
    setAmountError(null);
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
      <DialogTitle>
        Encaisser manuellement — {PAYMENT_METHOD_LABELS[method]}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {amountError ? <Alert severity="warning">{amountError}</Alert> : null}
          <TextField
            label="Montant reçu (€)"
            value={amountEuros}
            onChange={(e) => setAmountEuros(e.target.value)}
            fullWidth
            inputProps={{ inputMode: "decimal" }}
          />
          <TextField
            label="Date de réception"
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={paymentReferenceFieldLabel(method)}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            fullWidth
            inputProps={{ maxLength: PAYMENT_REFERENCE_MAX_LENGTH }}
            helperText="Facultatif — utile pour le suivi comptable."
          />
          <TextField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
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
