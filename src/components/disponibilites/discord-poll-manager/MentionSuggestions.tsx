"use client";

import { Box, List, ListItem, ListItemButton, ListItemText, Paper, Popper, Typography } from "@mui/material";
import type { DiscordRole, MentionableItem } from "./types";
import { filterMentionItems } from "./utils";

interface MentionSuggestionsProps {
  query: string;
  anchorEl: HTMLElement;
  position: number;
  discordMembers: Array<{ id: string; displayName: string; username?: string }>;
  discordRoles: DiscordRole[];
  onSelect: (position: number, item: MentionableItem) => void;
}

export function MentionSuggestions({
  query,
  anchorEl,
  position,
  discordMembers,
  discordRoles,
  onSelect,
}: MentionSuggestionsProps) {
  const filtered = filterMentionItems({
    discordMembers,
    discordRoles,
    query,
  });

  if (filtered.length === 0) {
    return null;
  }

  return (
    <Popper open={true} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 1300, mt: 0.5 }}>
      <Paper
        elevation={8}
        sx={{
          maxHeight: 300,
          overflow: "auto",
          minWidth: 280,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <List dense sx={{ py: 0.5 }}>
          {filtered.map((item) => (
            <ListItem key={`${item.type}-${item.id}`} disablePadding>
              <ListItemButton
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  onSelect(position, item);
                }}
                sx={{
                  borderRadius: 1,
                  mx: 0.5,
                  my: 0.25,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: item.type === "user" ? "primary.main" : "secondary.main",
                    color: "primary.contrastText",
                    mr: 1.5,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {item.type === "user" ? item.displayName.charAt(0).toUpperCase() : "@"}
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {item.type === "user" ? item.displayName : `@${item.displayName}`}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.type === "user" ? `@${item.username ?? ""}` : "Rôle"}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Popper>
  );
}
