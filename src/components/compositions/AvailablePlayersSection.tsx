"use client";

import React from "react";
import { Player } from "@/types/team-management";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";

interface AvailablePlayersSectionProps {
  subtitle: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredPlayers: Player[];
  renderPlayerItem: (player: Player) => React.ReactNode;
}

export function AvailablePlayersSection({
  subtitle,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredPlayers,
  renderPlayerItem,
}: AvailablePlayersSectionProps) {
  return (
    <AvailablePlayersPanel
      title="Joueurs disponibles"
      subtitle={subtitle}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      totalCount={totalCount}
      filteredPlayers={filteredPlayers}
      emptyMessage="Aucun joueur disponible"
      noResultMessage={(query) => `Aucun joueur trouvé pour “${query}”`}
      renderPlayerItem={renderPlayerItem}
    />
  );
}
