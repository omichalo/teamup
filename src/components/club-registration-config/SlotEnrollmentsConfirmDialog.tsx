"use client";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type Props = {
  open: boolean;
  closing: boolean;
  busy?: boolean;
  error?: string | null | undefined;
  slotLabel?: string | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

function slotPhrase(slotLabel: string | undefined): string {
  const trimmed = slotLabel?.trim();
  return trimmed ? ` sur « ${trimmed} »` : " sur ce créneau";
}

export function SlotEnrollmentsConfirmDialog({
  open,
  closing,
  busy = false,
  error,
  slotLabel,
  onCancel,
  onConfirm,
}: Props) {
  const title = closing ? "Fermer les adhésions ?" : "Réouvrir les adhésions ?";
  const confirmLabel = closing ? "Fermer les adhésions" : "Réouvrir les adhésions";
  const pendingLabel = closing ? "Fermeture..." : "Ouverture...";
  const description = closing
    ? `Marquer les adhésions comme fermées${slotPhrase(slotLabel)} ?`
    : `Marquer les adhésions comme ouvertes${slotPhrase(slotLabel)} ?`;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onCancel();
      }}
      aria-labelledby="slot-enrollments-confirm-title"
      aria-describedby="slot-enrollments-confirm-desc"
      aria-busy={busy}
    >
      <DialogTitle id="slot-enrollments-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="slot-enrollments-confirm-desc">{description}</DialogContentText>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button
          variant="contained"
          color={closing ? "warning" : "primary"}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? pendingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
