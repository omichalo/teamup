"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import {
  CANCELLATION_REASON_MAX_LENGTH,
  getRegistrationCancelConfirmationPhrase,
  isRegistrationCancelConfirmationValid,
} from "@/lib/club-registration/validate-registration-cancel-confirmation";

type Props = {
  open: boolean;
  registrationId: string;
  firstName: string;
  lastName: string;
  adherentDisplayName: string;
  hasActiveReceipts: boolean;
  onClose: () => void;
  onCancelled: () => void | Promise<void>;
};

type Step = "form" | "confirm";

export function CancelRegistrationDialog({
  open,
  registrationId,
  firstName,
  lastName,
  adherentDisplayName,
  hasActiveReceipts,
  onClose,
  onCancelled,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [reason, setReason] = useState("");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = { firstName, lastName };
  const confirmationPhrase = getRegistrationCancelConfirmationPhrase(identity);
  const confirmationMatches = isRegistrationCancelConfirmationValid(
    identity,
    confirmationInput
  );
  const reasonTrimmed = reason.trim();
  const reasonValid =
    reasonTrimmed.length > 0 && reasonTrimmed.length <= CANCELLATION_REASON_MAX_LENGTH;

  useEffect(() => {
    if (!open) {
      setStep("form");
      setReason("");
      setConfirmationInput("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleCancel = async () => {
    if (!confirmationMatches || !reasonValid || hasActiveReceipts) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/cancel`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reasonTrimmed,
            confirmationPhrase: confirmationInput.trim(),
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'annuler le dossier.");
      }
      await onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'annuler le dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {step === "form" ? "Annuler ce dossier ?" : "Confirmation d'annulation"}
      </DialogTitle>
      <DialogContent>
        {step === "form" ? (
          <Stack spacing={2}>
            <DialogContentText>
              Vous allez annuler le dossier de <strong>{adherentDisplayName}</strong>. Le
              dossier reste consultable (filtre « Annulé ») et les pièces comptables sont
              conservées. Une créance FAC ouverte sera clôturée par un avoir (AVO).
            </DialogContentText>
            {hasActiveReceipts ? (
              <Alert severity="error">
                Des encaissements (REC) sont encore actifs. Annulez-les d&apos;abord dans le
                suivi de paiement, puis réessayez.
              </Alert>
            ) : (
              <Alert severity="warning">
                Réservé aux doublons, erreurs de saisie ou désistements. Les e-mails déjà
                envoyés ne peuvent pas être rappelés.
              </Alert>
            )}
            <TextField
              label="Motif d'annulation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              required
              multiline
              minRows={2}
              disabled={hasActiveReceipts || submitting}
              inputProps={{ maxLength: CANCELLATION_REASON_MAX_LENGTH }}
              helperText={`${reasonTrimmed.length}/${CANCELLATION_REASON_MAX_LENGTH}`}
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <DialogContentText>
              Motif : <strong>{reasonTrimmed}</strong>
            </DialogContentText>
            <DialogContentText>
              Pour confirmer, recopiez la phrase ci-dessous (majuscules / accents tolérés).
            </DialogContentText>
            <Typography
              component="code"
              variant="body2"
              sx={{
                display: "block",
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: "action.hover",
                fontFamily: "monospace",
                wordBreak: "break-word",
              }}
            >
              {confirmationPhrase}
            </Typography>
            <TextField
              label="Phrase de confirmation"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              fullWidth
              autoFocus
              disabled={submitting}
              placeholder={confirmationPhrase}
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Fermer
        </Button>
        {step === "form" ? (
          <Button
            color="error"
            variant="contained"
            disabled={!reasonValid || hasActiveReceipts}
            onClick={() => setStep("confirm")}
          >
            Continuer
          </Button>
        ) : (
          <Button
            color="error"
            variant="contained"
            startIcon={<CancelOutlinedIcon />}
            disabled={!confirmationMatches || submitting}
            onClick={() => void handleCancel()}
          >
            {submitting ? "Annulation…" : "Annuler définitivement"}
          </Button>
        )}
      </DialogActions>
    </ResponsiveDialog>
  );
}
