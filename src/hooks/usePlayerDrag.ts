import { useCallback, useEffect, useState } from "react";
import { createDragImage } from "@/lib/compositions/drag-utils";
import type { Player } from "@/types/team-management";
import type { AssignmentValidationResult } from "@/lib/compositions/validation";

interface UsePlayerDragOptions {
  players: Player[];
  selectedPhase: "aller" | "retour" | null;
  getChampionshipTypeForPlayer: (playerId: string) => "masculin" | "feminin";
  canDropPlayer?: (playerId: string, teamId: string) => AssignmentValidationResult;
}

export function usePlayerDrag({
  players,
  selectedPhase,
  getChampionshipTypeForPlayer,
  canDropPlayer,
}: UsePlayerDragOptions) {
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

      event.dataTransfer.setData("playerId", playerId);
      event.dataTransfer.effectAllowed = "move";
      setDraggedPlayerId(playerId);
      setDragOverTeamId(null);
      document.documentElement.classList.add("dragging");

      const player = players.find((p) => p.id === playerId);
      if (!player) {
        return;
      }

      const championshipType = getChampionshipTypeForPlayer(playerId);
      const tempDiv = createDragImage(player, {
        championshipType,
        phase: (selectedPhase || "aller") as "aller" | "retour",
      });
      document.body.appendChild(tempDiv);
      void tempDiv.offsetHeight;
      event.dataTransfer.setDragImage(tempDiv, 0, 0);
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 0);
    },
    [getChampionshipTypeForPlayer, players, selectedPhase]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPlayerId(null);
    setDragOverTeamId(null);
    document.documentElement.classList.remove("dragging");
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, teamId: string) => {
      event.preventDefault();
      setDragOverTeamId(teamId);

      if (draggedPlayerId && canDropPlayer) {
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

  useEffect(() => {
    const clearDrag = () => {
      document.documentElement.classList.remove("dragging");
      setDraggedPlayerId(null);
      setDragOverTeamId(null);
    };

    window.addEventListener("drop", clearDrag);
    window.addEventListener("dragend", clearDrag);

    return () => {
      window.removeEventListener("drop", clearDrag);
      window.removeEventListener("dragend", clearDrag);
    };
  }, []);

  return {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    setDraggedPlayerId,
    setDragOverTeamId,
  };
}

export default usePlayerDrag;
