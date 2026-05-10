"use client";

import React from "react";
import { Box, TextField } from "@mui/material";
import {
  MentionSuggestions,
  type MentionableMember,
} from "@/components/compositions/MentionSuggestions";
import type { MentionAnchorState } from "@/lib/compositions/mention-autocomplete";

interface CustomMessageFieldProps {
  teamId: string;
  value: string;
  mentionAnchor: MentionAnchorState | null;
  mentionQuery: string;
  discordMembers: MentionableMember[];
  onChange: (
    teamId: string,
    value: string,
    target: HTMLInputElement | HTMLTextAreaElement,
    cursorPos: number
  ) => void;
  onKeyDown: (teamId: string, event: React.KeyboardEvent) => void;
  onBlur: (teamId: string, event: React.FocusEvent) => void;
  onSelectMention: (teamId: string, startPos: number, member: MentionableMember) => void;
}

export function CustomMessageField({
  teamId,
  value,
  mentionAnchor,
  mentionQuery,
  discordMembers,
  onChange,
  onKeyDown,
  onBlur,
  onSelectMention,
}: CustomMessageFieldProps) {
  return (
    <Box sx={{ mt: 1, position: "relative" }}>
      <TextField
        label="Message personnalisé (optionnel)"
        multiline
        rows={3}
        fullWidth
        value={value}
        onChange={(event) => {
          onChange(teamId, event.target.value, event.target, event.target.selectionStart || 0);
        }}
        onKeyDown={(event) => onKeyDown(teamId, event)}
        onBlur={(event) => onBlur(teamId, event)}
        placeholder="Tapez @ pour mentionner un membre Discord..."
        size="small"
        helperText="Tapez @ suivi du nom d'un membre pour le mentionner"
      />
      {mentionAnchor && mentionAnchor.teamId === teamId && (
        <MentionSuggestions
          members={discordMembers}
          query={mentionQuery}
          anchorEl={mentionAnchor.anchorEl}
          onSelect={(member) => {
            onSelectMention(teamId, mentionAnchor.startPos, member);
          }}
        />
      )}
    </Box>
  );
}
