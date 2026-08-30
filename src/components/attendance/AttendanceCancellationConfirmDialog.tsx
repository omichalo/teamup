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

export type AttendanceCancellationDialogMode = "cancel" | "restore";

export type AttendanceCancellationDialogScope = "slot" | "day" | "week";

type Props = {
  open: boolean;
  mode: AttendanceCancellationDialogMode;
  scope: AttendanceCancellationDialogScope;
  dateLabel: string;
  weekLabel?: string | undefined;
  slotLabel?: string | undefined;
  count: number;
  busy?: boolean;
  error?: string | null | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

function buildTitle(
  mode: AttendanceCancellationDialogMode,
  scope: AttendanceCancellationDialogScope,
  dateLabel: string,
  weekLabel: string | undefined
): string {
  if (mode === "restore") {
    if (scope === "week") {
      return `Restaurer la semaine du ${weekLabel ?? dateLabel} ?`;
    }
    if (scope === "day") {
      return `Restaurer les créneaux du ${dateLabel} ?`;
    }
    return `Restaurer ce créneau le ${dateLabel} ?`;
  }
  if (scope === "week") {
    return `Vider toute la semaine du ${weekLabel ?? dateLabel} ?`;
  }
  if (scope === "day") {
    return `Supprimer les créneaux du ${dateLabel} ?`;
  }
  return `Supprimer ce créneau le ${dateLabel} ?`;
}

function buildDescription(params: {
  mode: AttendanceCancellationDialogMode;
  scope: AttendanceCancellationDialogScope;
  slotLabel: string | undefined;
  count: number;
}): string {
  const slotPart = params.slotLabel?.trim()
    ? ` Créneau concerné : « ${params.slotLabel.trim()} ».`
    : "";
  const countPart =
    params.count === 1
      ? "1 occurrence sera mise à jour."
      : `${params.count} occurrences seront mises à jour.`;
  const shared =
    "Le catalogue des autres semaines reste inchangé. Les pointages déjà saisis sont conservés.";
  if (params.mode === "restore") {
    return `${countPart}${slotPart} ${shared}`;
  }
  return `${countPart}${slotPart} ${shared}`;
}

export function AttendanceCancellationConfirmDialog({
  open,
  mode,
  scope,
  dateLabel,
  weekLabel,
  slotLabel,
  count,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const title = buildTitle(mode, scope, dateLabel, weekLabel);
  const description = buildDescription({ mode, scope, slotLabel, count });
  const confirmLabel = mode === "restore" ? "Restaurer" : "Supprimer";
  const pendingLabel = mode === "restore" ? "Restauration…" : "Suppression…";

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onCancel();
      }}
      aria-labelledby="attendance-cancellation-confirm-title"
      aria-describedby="attendance-cancellation-confirm-desc"
      aria-busy={busy}
    >
      <DialogTitle id="attendance-cancellation-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="attendance-cancellation-confirm-desc">
          {description}
        </DialogContentText>
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
          color={mode === "cancel" ? "error" : "primary"}
          onClick={onConfirm}
          disabled={busy || count === 0}
          autoFocus
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? pendingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
