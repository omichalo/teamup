"use client";

import { AvailablePlayerListItem } from "@/components/compositions/AvailablePlayerListItem";
import { isParisEpreuve, type EpreuveType } from "@/lib/shared/epreuve-utils";
import type { Player } from "@/types/team-management";

type Props = {
  player: Player;
  selectedPhase: "aller" | "retour" | null;
  selectedEpreuve: EpreuveType | null;
  tabValue: number;
  draggedPlayerId: string | null;
  selectedPlayerId: string | null;
  dragEnabled: boolean;
  discordStatus: "none" | "invalid" | "valid";
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
  onSelectPlayer: (playerId: string) => void;
};

export function DailyCompositionAvailablePlayerItem({
  player,
  selectedPhase,
  selectedEpreuve,
  tabValue,
  draggedPlayerId,
  selectedPlayerId,
  dragEnabled,
  discordStatus,
  onDragStart,
  onDragEnd,
  onSelectPlayer,
}: Props) {
  const phase = selectedPhase || "aller";
  const championshipType = tabValue === 0 ? "masculin" : "feminin";
  const isParis = isParisEpreuve(selectedEpreuve);
  const burnedTeam = isParis
    ? player.highestTeamNumberByPhaseParis?.[phase]
    : championshipType === "masculin"
      ? player.highestMasculineTeamNumberByPhase?.[phase]
      : player.highestFeminineTeamNumberByPhase?.[phase];

  return (
    <AvailablePlayerListItem
      player={player}
      burnedTeam={burnedTeam}
      draggedPlayerId={draggedPlayerId}
      selectedPlayerId={selectedPlayerId}
      dragEnabled={dragEnabled}
      discordStatus={discordStatus}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onSelectPlayer={onSelectPlayer}
    />
  );
}
