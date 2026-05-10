"use client";

import React from "react";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";

interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
}

interface UsedByResult {
  used: boolean;
  playerName?: string;
}

interface DiscordMentionsAutocompleteProps {
  members: DiscordMember[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  findUsage: (discordId: string, excludePlayerId?: string) => UsedByResult;
  excludePlayerId?: string | undefined;
}

export function DiscordMentionsAutocomplete({
  members,
  selectedIds,
  onSelectedIdsChange,
  error,
  onErrorChange,
  findUsage,
  excludePlayerId,
}: DiscordMentionsAutocompleteProps) {
  return (
    <Autocomplete
      multiple
      options={members}
      getOptionLabel={(option) => option.displayName}
      value={selectedIds
        .map((id) => members.find((m) => m.id === id))
        .filter((m): m is DiscordMember => m !== undefined)}
      onChange={(_, newValue) => {
        onErrorChange(null);
        const newIds = newValue.map((m) => m.id);
        for (const member of newValue) {
          if (!selectedIds.includes(member.id)) {
            const check = findUsage(member.id, excludePlayerId);
            if (check.used) {
              onErrorChange(
                `Le login Discord "${member.displayName}" est deja associe au joueur "${check.playerName}".`
              );
              return;
            }
          }
        }
        onSelectedIdsChange(newIds);
      }}
      filterOptions={(options, { inputValue }) => {
        const query = inputValue.toLowerCase();
        return options.filter((member) => {
          if (selectedIds.includes(member.id)) {
            return false;
          }
          return (
            member.displayName.toLowerCase().includes(query) ||
            member.username.toLowerCase().includes(query)
          );
        });
      }}
      renderOption={(props, option) => {
        const check = findUsage(option.id, excludePlayerId);
        const isUsed = check.used;
        return (
          <Box component="li" {...props} key={option.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: isUsed ? "error.main" : "primary.main",
                color: "primary.contrastText",
                mr: 1.5,
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {option.displayName.charAt(0).toUpperCase()}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {option.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                @{option.username}
                {isUsed && ` - Deja utilise par ${check.playerName}`}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { size, InputLabelProps, ...restParams } = params;
        return (
          <TextField
            {...restParams}
            // @ts-expect-error InputLabelProps types mismatch from Autocomplete
            InputLabelProps={InputLabelProps}
            label="Discord (optionnel)"
            placeholder="Rechercher un membre Discord..."
            helperText={
              error ||
              (selectedIds.some((id) => !members.find((m) => m.id === id))
                ? "Certains IDs Discord ne correspondent plus a un utilisateur du serveur (indiques en rouge ci-dessous)"
                : "Recherchez et selectionnez les membres Discord a associer a ce joueur")
            }
            error={!!error}
          />
        );
      }}
      renderTags={(value, getTagProps) => (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {value.map((member, index) => {
            const isInvalid = !members.find((m) => m.id === member.id);
            return (
              <Chip
                {...getTagProps({ index })}
                key={member.id}
                label={member.displayName}
                {...(isInvalid ? { icon: <WarningIcon /> } : {})}
                color={isInvalid ? "error" : "default"}
                variant={isInvalid ? "outlined" : "filled"}
                size="small"
                {...(isInvalid
                  ? {
                      title:
                        "Cet ID Discord ne correspond plus a un utilisateur du serveur",
                    }
                  : {})}
              />
            );
          })}
        </Box>
      )}
      noOptionsText="Aucun membre trouve"
      loading={members.length === 0}
    />
  );
}
