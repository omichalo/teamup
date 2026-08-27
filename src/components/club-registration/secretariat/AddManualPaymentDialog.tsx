"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
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
import {
  PAYMENT_REFERENCE_MAX_LENGTH,
  paymentReferenceFieldLabel,
} from "@/lib/club-registration/payment/payment-reference";
import { formatCentsAsEuros } from "@/lib/pricing";
import { wouldCreateOverpayment } from "@/lib/club-registration/payment/overpayment";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Montant prérempli (souvent le reste dû). */
  suggestedAmountCents?: number;
  /** Reste dû actuel — sert à détecter un trop-perçu (si fourni). */
  remainingAmountCents?: number | null;
  /** Moyen proposé, sans contrainte — l'utilisateur peut le changer. */
  defaultMethod?: ReceivedPaymentMethodId;
  onSubmit: (input: {
    method: ReceivedPaymentMethodId;
    label: string;
    amountCents: number;
    receivedAt: string;
    note?: string;
    reference?: string;
    confirmOverpayment?: boolean;
  }) => Promise<void>;
};

export function AddManualPaymentDialog({
  open,
  onClose,
  suggestedAmountCents = 0,
  remainingAmountCents = null,
  defaultMethod = "cheque",
  onSubmit,
}: Props) {
  const [method, setMethod] = useState<ReceivedPaymentMethodId>("cheque");
  const [label, setLabel] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmOverpayment, setConfirmOverpayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMethod(defaultMethod);
    setLabel("");
    setAmountEuros(
      suggestedAmountCents > 0 ? centsToEurosInput(suggestedAmountCents) : ""
    );
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setReference("");
    setNote("");
    setConfirmOverpayment(false);
    setAmountError(null);
    // Réinitialiser uniquement à l'ouverture — pas quand le solde change pendant le submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: open edge only
  }, [open]);

  const amountCents = eurosInputToCents(amountEuros);
  const isOverpayment =
    remainingAmountCents != null &&
    amountCents > 0 &&
    wouldCreateOverpayment(remainingAmountCents, amountCents);

  const handleSubmit = async () => {
    if (amountCents <= 0) {
      setAmountError("Le montant doit être > 0.");
      return;
    }
    if (isOverpayment && !confirmOverpayment) {
      setAmountError("Cochez la confirmation du trop-perçu pour continuer.");
      return;
    }

    setSubmitting(true);
    setAmountError(null);
    try {
      await onSubmit({
        method,
        label,
        amountCents,
        receivedAt: new Date(receivedAt).toISOString(),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(isOverpayment ? { confirmOverpayment: true } : {}),
      });
      onClose();
    } catch {
      // L'erreur est gérée par le parent ; la popin reste ouverte.
    } finally {
      setSubmitting(false);
    }
  };

  const showReferenceField =
    method === "cheque" || method === "holiday_vouchers";

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Ajouter un paiement reçu</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1 }}>
          Utilisez ce formulaire lorsqu’un encaissement ne correspond pas aux lignes «
          paiements attendus » (montant libre, autre moyen, correction).
        </DialogContentText>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {amountError ? <Alert severity="warning">{amountError}</Alert> : null}
          {isOverpayment ? (
            <Alert severity="warning">
              Le reste dû est de {formatCentsAsEuros(remainingAmountCents)}. Ce
              montant créera un trop-perçu de{" "}
              {formatCentsAsEuros(amountCents - Math.max(0, remainingAmountCents))}.
            </Alert>
          ) : null}
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
            onChange={(e) => {
              setAmountEuros(e.target.value);
              setConfirmOverpayment(false);
              setAmountError(null);
            }}
            fullWidth
            placeholder={centsToEurosInput(0) || "0,00"}
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
          {showReferenceField ? (
            <TextField
              label={paymentReferenceFieldLabel(method)}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              fullWidth
              inputProps={{ maxLength: PAYMENT_REFERENCE_MAX_LENGTH }}
              helperText="Facultatif — utile pour le suivi comptable."
            />
          ) : null}
          <TextField
            label="Note interne"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          {isOverpayment ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmOverpayment}
                  onChange={(e) => setConfirmOverpayment(e.target.checked)}
                />
              }
              label="Je confirme l’enregistrement d’un trop-perçu"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || (isOverpayment && !confirmOverpayment)}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
