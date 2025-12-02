"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface ConfirmationDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (() => void) | (() => Promise<void>);
}

interface ConfirmResendDialogState {
  open: boolean;
  teamId: string | null;
  matchInfo: string | null;
  channelId?: string;
}

interface CompositionDialogsProps {
  confirmationDialog: ConfirmationDialogState;
  onCloseConfirmation: () => void;
  onConfirmConfirmation: () => void;
  confirmResendDialog: ConfirmResendDialogState;
  onCloseResend: () => void;
  onConfirmResend: () => void;
}

/**
 * Composant pour gérer les dialogs de confirmation dans la page des compositions
 */
export function CompositionDialogs(props: CompositionDialogsProps) {
  const {
    confirmationDialog,
    onCloseConfirmation,
    onConfirmConfirmation,
    confirmResendDialog,
    onCloseResend,
    onConfirmResend,
  } = props;

  return (
    <>
      {/* Dialog de confirmation générique (reset, apply defaults, etc.) */}
      <Dialog
        open={confirmationDialog.open}
        onClose={onCloseConfirmation}
        aria-labelledby="composition-confirmation-dialog-title"
      >
        <DialogTitle id="composition-confirmation-dialog-title">
          {confirmationDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmationDialog.description}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseConfirmation}>
            {confirmationDialog.cancelLabel ?? "Annuler"}
          </Button>
          <Button
            onClick={onConfirmConfirmation}
            color="primary"
            variant="contained"
            autoFocus
          >
            {confirmationDialog.confirmLabel ?? "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation pour renvoyer le message Discord */}
      <Dialog open={confirmResendDialog.open} onClose={onCloseResend}>
        <DialogTitle>Renvoyer le message Discord ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Un message a déjà été envoyé pour ce match. Voulez-vous vraiment
            le renvoyer ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResend}>Annuler</Button>
          <Button
            onClick={onConfirmResend}
            color="warning"
            variant="contained"
          >
            Renvoyer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

