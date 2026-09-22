"use client";

import {
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";

type Props = {
  open: boolean;
  playerName: string;
  slotLabel?: string | undefined;
  busy?: boolean;
  error?: string | null | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AttendanceRemoveFromSlotDialog({
  open,
  playerName,
  slotLabel,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const slotPart = slotLabel?.trim()
    ? ` du créneau « ${slotLabel.trim()} »`
    : " de ce créneau";

  return (
    <ResponsiveDialog open={open} onClose={busy ? () => undefined : onCancel} maxWidth="sm">
      <DialogTitle>Retirer {playerName} ?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {playerName} ne sera plus inscrit{slotPart} pour les prochaines séances. Les
          pointages déjà saisis les semaines précédentes sont conservés.
        </DialogContentText>
        {error ? (
          <DialogContentText color="error" sx={{ mt: 1 }}>
            {error}
          </DialogContentText>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={busy}
          sx={{ minHeight: 44 }}
        >
          {busy ? <CircularProgress size={22} color="inherit" /> : "Retirer du créneau"}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
