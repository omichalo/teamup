"use client";

import { useCallback, useState } from "react";

interface ConfirmationDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (() => void) | (() => Promise<void>) | undefined;
}

interface UseCompositionsConfirmationDialogParams {
  canResetButton: boolean;
  canCopyDefaultsButton: boolean;
  hasAssignedPlayers: boolean;
  selectedJournee: number | null;
  runResetCompositions: () => Promise<void>;
  runApplyDefaultCompositions: () => Promise<void>;
}

export function useCompositionsConfirmationDialog({
  canResetButton,
  canCopyDefaultsButton,
  hasAssignedPlayers,
  selectedJournee,
  runResetCompositions,
  runApplyDefaultCompositions,
}: UseCompositionsConfirmationDialogParams) {
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState>({
      open: false,
      title: "",
      description: "",
      confirmLabel: "Confirmer",
      cancelLabel: "Annuler",
    });

  const handleResetButtonClick = useCallback(() => {
    if (!canResetButton) {
      return;
    }

    setConfirmationDialog({
      open: true,
      title: "Réinitialiser les compositions",
      description:
        selectedJournee !== null
          ? `Réinitialiser toutes les compositions (masculines et féminines) pour la journée ${selectedJournee} ?`
          : "Réinitialiser toutes les compositions ?",
      confirmLabel: "Réinitialiser",
      cancelLabel: "Annuler",
      onConfirm: () => {
        void runResetCompositions();
      },
    });
  }, [canResetButton, runResetCompositions, selectedJournee]);

  const handleApplyDefaultsClick = useCallback(() => {
    if (!canCopyDefaultsButton) {
      return;
    }

    if (hasAssignedPlayers) {
      setConfirmationDialog({
        open: true,
        title: "Remplacer par les compositions par défaut",
        description:
          selectedJournee !== null
            ? `Des compositions existent pour la journée ${selectedJournee}. Les remplacer par les compositions par défaut (toutes équipes) ?`
            : "Des compositions existent déjà. Les remplacer par les compositions par défaut ?",
        confirmLabel: "Remplacer",
        cancelLabel: "Annuler",
        onConfirm: () => {
          void runApplyDefaultCompositions();
        },
      });
      return;
    }

    void runApplyDefaultCompositions();
  }, [
    canCopyDefaultsButton,
    hasAssignedPlayers,
    runApplyDefaultCompositions,
    selectedJournee,
  ]);

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirmDialog = useCallback(() => {
    const action = confirmationDialog.onConfirm;
    if (action) {
      void action();
    }
    setConfirmationDialog((prev) => {
      const rest = { ...prev };
      delete rest.onConfirm;
      return {
        ...rest,
        open: false,
      };
    });
  }, [confirmationDialog.onConfirm]);

  return {
    confirmationDialog,
    handleResetButtonClick,
    handleApplyDefaultsClick,
    handleCancelConfirmation,
    handleConfirmDialog,
  };
}
