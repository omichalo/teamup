import { useCallback, useEffect, useState } from "react";
import { createDragImage } from "@/lib/compositions/drag-utils";
import type { AssignmentValidationResult } from "@/lib/compositions/validation";
import type { Player } from "@/types/team-management";

interface DragPreviewOptions {
  championshipType?: "masculin" | "feminin";
  phase?: "aller" | "retour";
}

interface UsePlayerDragOptions {
  players: Player[];
  onDrop: (
    teamId: string,
    playerId: string,
    validation: AssignmentValidationResult
  ) => void | Promise<void>;
  canDropPlayer: (playerId: string, teamId: string) => AssignmentValidationResult;
  getPreviewOptions?: (playerId: string) => DragPreviewOptions | undefined;
  onInvalidDrop?: (validation: AssignmentValidationResult) => void;
  dataTransferKey?: string;
}

export const usePlayerDrag = ({
  players,
  onDrop,
  canDropPlayer,
  getPreviewOptions,
  onInvalidDrop,
  dataTransferKey = "playerId",
}: UsePlayerDragOptions) => {
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (event: React.DragEvent, playerId: string) => {
      const target = event.target as HTMLElement;
      const clickedChip =
        target.closest('[data-chip="remove"]') ||
        target.closest('button[aria-label*="remove"]') ||
        (target.tagName === "BUTTON" && target.textContent?.trim() === "×");

      if (clickedChip || target.textContent?.trim() === "×") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.dataTransfer.setData(dataTransferKey, playerId);
      event.dataTransfer.effectAllowed = "move";
      setDraggedPlayerId(playerId);
      setDragOverTeamId(null);
      document.documentElement.classList.add("dragging");

      const player = players.find((p) => p.id === playerId);
      if (!player) {
        return;
      }

      const previewOptions = getPreviewOptions?.(playerId) ?? {};
      const tempDiv = createDragImage(player, previewOptions);
      document.body.appendChild(tempDiv);
      void tempDiv.offsetHeight;
      event.dataTransfer.setDragImage(tempDiv, 0, 0);
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 0);
    },
    [dataTransferKey, getPreviewOptions, players]
  );

  const resetDragState = useCallback(() => {
    setDraggedPlayerId(null);
    setDragOverTeamId(null);
    document.documentElement.classList.remove("dragging");

    const style = document.getElementById("drag-cursor-style");
    if (style) {
      style.remove();
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  useEffect(() => {
    const clearDrag = () => {
      resetDragState();
    };

    window.addEventListener("drop", clearDrag);
    window.addEventListener("dragend", clearDrag);

    return () => {
      window.removeEventListener("drop", clearDrag);
      window.removeEventListener("dragend", clearDrag);
    };
  }, [resetDragState]);

  const handleDragOver = useCallback(
    (event: React.DragEvent, teamId: string) => {
      event.preventDefault();
      setDragOverTeamId(teamId);

      if (draggedPlayerId) {
        const validation = canDropPlayer(draggedPlayerId, teamId);
        event.dataTransfer.dropEffect = validation.canAssign ? "move" : "none";
      } else {
        event.dataTransfer.dropEffect = "move";
      }
    },
    [canDropPlayer, draggedPlayerId]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverTeamId(null);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent, teamId: string) => {
      event.preventDefault();
      const playerId = event.dataTransfer.getData(dataTransferKey);

      setDragOverTeamId(null);

      if (!playerId) {
        setDraggedPlayerId(null);
        return;
      }

      const validation = canDropPlayer(playerId, teamId);
      if (!validation.canAssign) {
        onInvalidDrop?.(validation);
        setDraggedPlayerId(null);
        return;
      }

      await onDrop(teamId, playerId, validation);
      event.dataTransfer.clearData();
      setDraggedPlayerId(null);
    },
    [canDropPlayer, dataTransferKey, onDrop, onInvalidDrop]
  );

  return {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetDragState,
  };
};
