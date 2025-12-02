import { useMemo, useCallback } from "react";

interface UseCompositionActionsOptions {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  hasAssignedPlayers: boolean;
  hasDefaultCompositions: boolean;
  defaultCompositionsLoaded: boolean;
  availabilitiesLoaded: boolean;
  isResetting: boolean;
  isApplyingDefaults: boolean;
  runResetCompositions: () => Promise<void>;
  runApplyDefaultCompositions: () => Promise<void>;
  setConfirmationDialog: (dialog: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: (() => void) | (() => Promise<void>);
  }) => void;
}

export function useCompositionActions({
  selectedJournee,
  selectedPhase,
  hasAssignedPlayers,
  hasDefaultCompositions,
  defaultCompositionsLoaded,
  availabilitiesLoaded,
  isResetting,
  isApplyingDefaults,
  runResetCompositions,
  runApplyDefaultCompositions,
  setConfirmationDialog,
}: UseCompositionActionsOptions) {
  const canResetButton = useMemo(
    () =>
      selectedJournee !== null &&
      selectedPhase !== null &&
      hasAssignedPlayers &&
      !isResetting,
    [hasAssignedPlayers, isResetting, selectedJournee, selectedPhase]
  );

  const canCopyDefaultsButton = useMemo(
    () =>
      selectedJournee !== null &&
      selectedPhase !== null &&
      defaultCompositionsLoaded &&
      availabilitiesLoaded &&
      hasDefaultCompositions &&
      !isApplyingDefaults,
    [
      availabilitiesLoaded,
      defaultCompositionsLoaded,
      hasDefaultCompositions,
      isApplyingDefaults,
      selectedJournee,
      selectedPhase,
    ]
  );

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
  }, [
    canResetButton,
    runResetCompositions,
    selectedJournee,
    setConfirmationDialog,
  ]);

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
    setConfirmationDialog,
  ]);

  return {
    canResetButton,
    canCopyDefaultsButton,
    handleResetButtonClick,
    handleApplyDefaultsClick,
  };
}

