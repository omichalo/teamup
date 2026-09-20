"use client";

import { useCallback } from "react";
import { DailyCompositionAvailablePlayerItem } from "@/components/compositions/DailyCompositionAvailablePlayerItem";
import { formatPlayerSelectionLabel } from "@/components/compositions/CompositionSelectionBar";
import { useCompositionAssignments } from "@/hooks/useCompositionAssignments";
import { useCompositionDragEnabled } from "@/hooks/useCompositionDragEnabled";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import type { CompositionService } from "@/lib/services/composition-service";
import type { Player } from "@/types/team-management";

type Params = {
  players: Player[];
  equipes: EquipeWithMatches[];
  filteredEquipes: EquipeWithMatches[];
  compositions: Record<string, string[]>;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  selectedEpreuve: EpreuveType | null;
  tabValue: number;
  compositionService: CompositionService;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  setCompositions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setDefaultCompositions: React.Dispatch<
    React.SetStateAction<{
      masculin: Record<string, string[]>;
      feminin: Record<string, string[]>;
    }>
  >;
  getDiscordStatus: (player: Player) => "none" | "invalid" | "valid";
};

export function useDailyCompositionAssignmentUi({
  players,
  equipes,
  filteredEquipes,
  compositions,
  selectedPhase,
  selectedJournee,
  selectedEpreuve,
  tabValue,
  compositionService,
  getMaxPlayersForTeam,
  setCompositions,
  setDefaultCompositions,
  getDiscordStatus,
}: Params) {
  const dragEnabled = useCompositionDragEnabled();
  const assignment = useCompositionAssignments({
    players,
    equipes,
    filteredEquipes,
    compositions,
    selectedPhase,
    selectedJournee,
    tabValue,
    compositionService,
    getMaxPlayersForTeam,
    setCompositions,
    setDefaultCompositions,
  });

  const renderAvailablePlayerItem = useCallback(
    (player: Player) => (
      <DailyCompositionAvailablePlayerItem
        player={player}
        selectedPhase={selectedPhase}
        selectedEpreuve={selectedEpreuve}
        tabValue={tabValue}
        draggedPlayerId={assignment.draggedPlayerId}
        selectedPlayerId={assignment.selectedPlayerId}
        dragEnabled={dragEnabled}
        discordStatus={getDiscordStatus(player)}
        onDragStart={assignment.handleDragStart}
        onDragEnd={assignment.handleDragEnd}
        onSelectPlayer={assignment.selectPlayer}
      />
    ),
    [
      assignment.draggedPlayerId,
      assignment.handleDragEnd,
      assignment.handleDragStart,
      assignment.selectPlayer,
      assignment.selectedPlayerId,
      dragEnabled,
      getDiscordStatus,
      selectedEpreuve,
      selectedPhase,
      tabValue,
    ]
  );

  return {
    ...assignment,
    dragEnabled,
    renderAvailablePlayerItem,
    selectionPlayerLabel: formatPlayerSelectionLabel(
      players,
      assignment.selectedPlayerId
    ),
  };
}
