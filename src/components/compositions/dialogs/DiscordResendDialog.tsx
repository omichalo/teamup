"use client";

import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";

interface DiscordResendDialogProps {
  open: boolean;
  teamName?: string | null;
  matchInfo?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DiscordResendDialog: React.FC<DiscordResendDialogProps> = ({
  open,
  teamName,
  matchInfo,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="discord-resend-dialog-title">
      <DialogTitle id="discord-resend-dialog-title">
        Renvoyer le message Discord ?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {teamName && (
            <>
              Vous allez renvoyer la composition pour <strong>{teamName}</strong>.
              <br />
            </>
          )}
          {matchInfo && `Match : ${matchInfo}`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Annuler</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};
