"use client";

import { Box } from "@mui/material";
import type { Player } from "@/types/team-management";
import { AvailablePlayersPanel } from "./AvailablePlayersPanel";
import { CompositionsSummary } from "./CompositionsSummary";
import { CompositionTabsContent } from "./CompositionTabsContent";
import type { CompositionTabsContentProps } from "./CompositionTabsContent";

interface CompositionPageLayoutProps {
  // Props pour AvailablePlayersPanel
  availablePlayersPanel: {
    title: string;
    subtitle: string;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    totalCount: number;
    filteredPlayers: Player[];
    renderPlayerItem: (player: Player) => React.ReactNode;
    actions?: React.ReactNode;
  };
  // Props pour CompositionsSummary
  summary: {
    totalTeams: number;
    completedTeams: number;
    incompleteTeams: number;
    invalidTeams?: number;
    matchesPlayed?: number;
    percentage?: number;
    title?: string;
    discordMessagesSent?: number;
    discordMessagesTotal?: number;
    showMatchesPlayed?: boolean;
  };
  // Props pour CompositionTabsContent
  tabsContent: CompositionTabsContentProps;
}

/**
 * Composant pour le layout commun des pages de compositions
 * Gère l'affichage de AvailablePlayersPanel, CompositionsSummary et CompositionTabsContent
 */
export function CompositionPageLayout(props: CompositionPageLayoutProps) {
  const { availablePlayersPanel, summary, tabsContent } = props;

  return (
    <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
      <AvailablePlayersPanel
        title={availablePlayersPanel.title}
        subtitle={availablePlayersPanel.subtitle}
        searchQuery={availablePlayersPanel.searchQuery}
        onSearchChange={availablePlayersPanel.onSearchChange}
        totalCount={availablePlayersPanel.totalCount}
        filteredPlayers={availablePlayersPanel.filteredPlayers}
        renderPlayerItem={availablePlayersPanel.renderPlayerItem}
        emptyMessage="Aucun joueur disponible"
        noResultMessage={(query) => `Aucun joueur trouvé pour "${query}"`}
        actions={availablePlayersPanel.actions}
      />

      <Box sx={{ flex: 1 }}>
        <CompositionsSummary
          totalTeams={summary.totalTeams}
          completedTeams={summary.completedTeams}
          incompleteTeams={summary.incompleteTeams}
          invalidTeams={summary.invalidTeams ?? 0}
          matchesPlayed={summary.matchesPlayed ?? 0}
          {...(summary.percentage !== undefined && { percentage: summary.percentage })}
          {...(summary.title !== undefined && { title: summary.title })}
          discordMessagesSent={summary.discordMessagesSent ?? 0}
          discordMessagesTotal={summary.discordMessagesTotal ?? 0}
          showMatchesPlayed={summary.showMatchesPlayed ?? true}
        />

        <CompositionTabsContent {...tabsContent} />
      </Box>
    </Box>
  );
}

