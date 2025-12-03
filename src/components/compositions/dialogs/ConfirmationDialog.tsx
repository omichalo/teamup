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

export interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  description,
  cancelLabel = "Annuler",
  confirmLabel = "Confirmer",
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="confirmation-dialog-title">
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
