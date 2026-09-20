"use client";

import React from "react";
import { Paper, Box, Typography, Divider, List } from "@mui/material";
import type { Player } from "@/types/team-management";
import { SearchInput } from "./Filters/SearchInput";

export interface AvailablePlayersPanelProps {
  title: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredPlayers: Player[];
  renderPlayerItem: (player: Player) => React.ReactNode;
  emptyMessage: string;
  noResultMessage: (query: string) => string;
  containerProps?: {
    minWidth?: number;
    maxWidth?: number;
  };
  actions?: React.ReactNode;
}

export const AvailablePlayersPanel: React.FC<AvailablePlayersPanelProps> = ({
  title,
  subtitle,
  headerContent,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredPlayers,
  renderPlayerItem,
  emptyMessage,
  noResultMessage,
  containerProps,
  actions,
}) => {
  const showEmptyState = totalCount === 0;
  const showNoResultState = totalCount > 0 && filteredPlayers.length === 0;

  return (
    <Paper
      sx={{
        width: { xs: "100%", md: "auto" },
        position: { xs: "static", md: "sticky" },
        top: { md: 20 },
        alignSelf: { md: "flex-start" },
        minWidth: { xs: "auto", md: containerProps?.minWidth ?? 300 },
        maxWidth: { xs: "none", md: containerProps?.maxWidth ?? 350 },
        maxHeight: {
          xs: "min(42vh, 360px)",
          md: "calc(100vh - 100px)",
        },
        overflow: "auto",
      }}
    >
      <Box sx={{ p: 2 }}>
        {headerContent && <Box sx={{ mb: 2 }}>{headerContent}</Box>}

        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 2, display: "block" }}
          >
            {subtitle}
          </Typography>
        )}
        <Divider sx={{ mb: 2 }} />
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Rechercher un joueur..."
          sx={{ mb: actions ? 1.5 : 2 }}
        />

        {actions && <Box sx={{ mb: 2 }}>{actions}</Box>}

        {showEmptyState ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : showNoResultState ? (
          <Typography variant="body2" color="text.secondary">
            {noResultMessage(searchQuery)}
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredPlayers.map((player) => (
              <React.Fragment key={player.id}>{renderPlayerItem(player)}</React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};
