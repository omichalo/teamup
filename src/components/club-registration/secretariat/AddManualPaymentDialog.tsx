"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  RECEIVED_PAYMENT_METHOD_IDS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  type ReceivedPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import {
  centsToEurosInput,
  eurosInputToCents,
} from "@/lib/club-registration/payment/payment-draft-helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    method: ReceivedPaymentMethodId;
    label: string;
    amountCents: number;
    receivedAt: string;
    note?: string;
  }) => Promise<void>;
};

export function AddManualPaymentDialog({ open, onClose, onSubmit }: Props) {
  const [method, setMethod] = useState<ReceivedPaymentMethodId>("cheque");
  const [label, setLabel] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amountCents = eurosInputToCents(amountEuros);
    if (amountCents <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        method,
        label,
        amountCents,
        receivedAt: new Date(receivedAt).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
      setAmountEuros("");
      setNote("");
      setLabel("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter un paiement reçu</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1 }}>
          Utilisez ce formulaire lorsqu’un encaissement ne correspond pas aux lignes «
          paiements attendus » (montant libre, autre moyen, correction).
        </DialogContentText>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="Moyen de paiement"
            value={method}
            onChange={(e) => setMethod(e.target.value as ReceivedPaymentMethodId)}
            fullWidth
          >
            {RECEIVED_PAYMENT_METHOD_IDS.map((id) => (
              <MenuItem key={id} value={id}>
                {RECEIVED_PAYMENT_METHOD_LABELS[id]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Libellé"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            fullWidth
            placeholder="Ex. Chèque reçu au bureau"
          />
          <TextField
            label="Montant (€)"
            value={amountEuros}
            onChange={(e) => setAmountEuros(e.target.value)}
            fullWidth
            placeholder={centsToEurosInput(0) || "0,00"}
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
            label="Note interne"
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
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
