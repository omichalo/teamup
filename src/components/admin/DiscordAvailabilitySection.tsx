"use client";

import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

export interface DiscordMentionOption {
  id: string;
  name: string;
  type: "user" | "role";
  displayName: string;
}

interface DiscordChannelHierarchyGroup {
  category: { id: string; name: string; position: number } | null;
  channels: Array<{ id: string; name: string; position: number }>;
}

interface DiscordAvailabilitySectionProps {
  title: string;
  channelId: string | null;
  mention: string | null;
  channels: Array<{ id: string; name: string }>;
  channelsHierarchy: DiscordChannelHierarchyGroup[];
  mentionOptions: DiscordMentionOption[];
  loadingChannels: boolean;
  loadingRoles: boolean;
  loadingMentions: boolean;
  saving: boolean;
  onRefresh: () => void;
  onChannelChange: (channelId: string | null) => void;
  onMentionChange: (mention: string | null) => void;
  parseMentionToOption: (mention: string | null) => DiscordMentionOption | null;
  optionToMention: (option: DiscordMentionOption | null) => string | null;
}

export function DiscordAvailabilitySection({
  title,
  channelId,
  mention,
  channels,
  channelsHierarchy,
  mentionOptions,
  loadingChannels,
  loadingRoles,
  loadingMentions,
  saving,
  onRefresh,
  onChannelChange,
  onMentionChange,
  parseMentionToOption,
  optionToMention,
}: DiscordAvailabilitySectionProps) {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loadingChannels || loadingRoles}
          >
            Actualiser
          </Button>
        </Box>

        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Channel Discord</InputLabel>
            <Select
              value={channelId || ""}
              label="Channel Discord"
              onChange={(e) => onChannelChange(e.target.value || null)}
              disabled={loadingChannels || saving}
            >
              <MenuItem value="">
                <em>Aucun channel</em>
              </MenuItem>
              {channelsHierarchy.length > 0
                ? channelsHierarchy.flatMap((group) => [
                    ...(group.category
                      ? [
                          <MenuItem
                            key={`category-${group.category.id}`}
                            disabled
                            sx={{ fontWeight: "bold", opacity: 1 }}
                          >
                            📁 {group.category.name}
                          </MenuItem>,
                        ]
                      : []),
                    ...group.channels.map((channel) => (
                      <MenuItem
                        key={channel.id}
                        value={channel.id}
                        sx={{ pl: group.category ? 4 : 2 }}
                      >
                        {group.category ? "  " : ""}#{channel.name}
                      </MenuItem>
                    )),
                  ])
                : channels.map((channel) => (
                    <MenuItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </MenuItem>
                  ))}
            </Select>
            {loadingChannels ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Chargement des channels...
              </Typography>
            ) : null}
          </FormControl>

          <Autocomplete
            options={mentionOptions}
            getOptionKey={(option) => `${option.type}-${option.id}`}
            getOptionLabel={(option) =>
              option.type === "user"
                ? `${option.displayName} (@${option.name})`
                : `@${option.displayName}`
            }
            value={parseMentionToOption(mention)}
            onChange={(_, newValue) => {
              onMentionChange(optionToMention(newValue));
            }}
            filterOptions={(options, { inputValue }) => {
              const query = inputValue.toLowerCase();
              return options.filter(
                (option) =>
                  option.displayName.toLowerCase().includes(query) ||
                  option.name.toLowerCase().includes(query)
              );
            }}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={key} {...otherProps}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor:
                        option.type === "user" ? "primary.main" : "secondary.main",
                      color: "primary.contrastText",
                      mr: 1.5,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                    }}
                  >
                    {option.type === "user"
                      ? option.displayName.charAt(0).toUpperCase()
                      : "@"}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {option.type === "user"
                        ? option.displayName
                        : `@${option.displayName}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.type === "user" ? `@${option.name}` : "Rôle"}
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
                  // @ts-expect-error - InputLabelProps from Autocomplete has incompatible types with TextField
                  InputLabelProps={InputLabelProps}
                  label="Mention Discord"
                  placeholder="Rechercher un utilisateur ou un rôle..."
                  helperText="Sélectionnez un utilisateur ou un rôle à mentionner lors de la création d'un sondage."
                />
              );
            }}
            noOptionsText="Aucun utilisateur ou rôle trouvé"
            loadingText="Chargement des utilisateurs et rôles..."
            loading={loadingMentions}
            disabled={saving}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
