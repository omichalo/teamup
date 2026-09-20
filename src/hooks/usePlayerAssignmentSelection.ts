import { useCallback, useState } from "react";
import type { AssignmentValidationResult } from "@/lib/compositions/validators";

interface UsePlayerAssignmentSelectionOptions {
  canDropPlayer: (playerId: string, teamId: string) => AssignmentValidationResult;
  onAssign: (teamId: string, playerId: string) => void | Promise<void> | Promise<boolean>;
  onInvalidAssign?: (validation: AssignmentValidationResult) => void;
}

export function usePlayerAssignmentSelection({
  canDropPlayer,
  onAssign,
  onInvalidAssign,
}: UsePlayerAssignmentSelectionOptions) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedPlayerId(null);
  }, []);

  const clearSelectionFeedback = useCallback(() => {
    setSelectionFeedback(null);
  }, []);

  const selectPlayer = useCallback((playerId: string) => {
    setSelectionFeedback(null);
    setSelectedPlayerId((prev) => (prev === playerId ? null : playerId));
  }, []);

  const assignSelectedPlayerToTeam = useCallback(
    async (teamId: string) => {
      if (!selectedPlayerId) {
        return;
      }
      const validation = canDropPlayer(selectedPlayerId, teamId);
      if (!validation.canAssign) {
        const reason = validation.reason || "Assignation impossible pour cette équipe.";
        setSelectionFeedback(reason);
        onInvalidAssign?.(validation);
        return;
      }
      await onAssign(teamId, selectedPlayerId);
      setSelectedPlayerId(null);
      setSelectionFeedback(null);
    },
    [canDropPlayer, onAssign, onInvalidAssign, selectedPlayerId]
  );

  return {
    selectedPlayerId,
    selectionFeedback,
    selectPlayer,
    clearSelection,
    clearSelectionFeedback,
    assignSelectedPlayerToTeam,
  };
}
