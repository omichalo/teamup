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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  getRegistrationDeleteConfirmationPhrase,
  isRegistrationDeleteConfirmationValid,
} from "@/lib/club-registration/validate-registration-delete-confirmation";

type Props = {
  open: boolean;
  registrationId: string;
  firstName: string;
  lastName: string;
  adherentDisplayName: string;
  status?: string | null | undefined;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
};

type Step = "warning" | "confirm";

const PAID_OR_APPROVED_STATUSES = new Set(["paid", "approved"]);

export function DeleteRegistrationDialog({
  open,
  registrationId,
  firstName,
  lastName,
  adherentDisplayName,
  status,
  onClose,
  onDeleted,
}: Props) {
  const [step, setStep] = useState<Step>("warning");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = { firstName, lastName };
  const confirmationPhrase = getRegistrationDeleteConfirmationPhrase(identity);
  const confirmationMatches = isRegistrationDeleteConfirmationValid(
    identity,
    confirmationInput
  );
  const isSensitiveStatus = status ? PAID_OR_APPROVED_STATUSES.has(status) : false;

  useEffect(() => {
    if (!open) {
      setStep("warning");
      setConfirmationInput("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmationMatches) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationPhrase: confirmationInput.trim() }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible de supprimer le dossier.");
      }
      await onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {step === "warning" ? "Supprimer ce dossier ?" : "Confirmation de suppression"}
      </DialogTitle>
      <DialogContent>
        {step === "warning" ? (
          <Stack spacing={2}>
            <DialogContentText>
              Vous allez supprimer définitivement le dossier de{" "}
              <strong>{adherentDisplayName}</strong>. Cette action est irréversible : le dossier,
              son historique de paiement et les notes associées seront effacés.
            </DialogContentText>
            {isSensitiveStatus ? (
              <Alert severity="error">
                Ce dossier est au statut « {status} ». Assurez-vous qu&apos;aucun suivi comptable ou
                légal ne dépend encore de cet enregistrement.
              </Alert>
            ) : (
              <Alert severity="warning">
                Utilisez cette action pour retirer un doublon ou un dossier créé par erreur. Les
                e-mails déjà envoyés ne peuvent pas être annulés.
              </Alert>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
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
          Annuler
        </Button>
        {step === "warning" ? (
          <Button
            color="error"
            variant="contained"
            onClick={() => setStep("confirm")}
          >
            Continuer
          </Button>
        ) : (
          <Button
            color="error"
            variant="contained"
            startIcon={<DeleteForeverIcon />}
            disabled={!confirmationMatches || submitting}
            onClick={() => void handleDelete()}
          >
            {submitting ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
