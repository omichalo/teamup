import { useState, useCallback } from "react";

interface ConfirmationDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (() => void) | (() => Promise<void>);
}

export function useCompositionConfirmation() {
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState>({
      open: false,
      title: "",
      description: "",
      confirmLabel: "Confirmer",
      cancelLabel: "Annuler",
    });

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirmDialog = useCallback(() => {
    const action = confirmationDialog.onConfirm;
    if (action) {
      void action();
    }
    setConfirmationDialog((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onConfirm, ...rest } = prev;
      return {
        ...rest,
        open: false,
      };
    });
  }, [confirmationDialog.onConfirm]);

  return {
    confirmationDialog,
    setConfirmationDialog,
    handleCancelConfirmation,
    handleConfirmDialog,
  };
}

