"use client";

import { Box, TextField } from "@mui/material";
import type { ReactNode } from "react";
import type { DiscordRole, MentionAnchorState, MentionableItem } from "./types";
import { MentionSuggestions } from "./MentionSuggestions";

interface MentionMessageFieldProps {
  label: string;
  value: string;
  textareaRef: HTMLTextAreaElement | null;
  setTextareaRef: (ref: HTMLTextAreaElement | null) => void;
  mentionAnchor: MentionAnchorState | null;
  mentionQuery: string;
  discordMembers: Array<{ id: string; displayName: string; username?: string }>;
  discordRoles: DiscordRole[];
  helperText: ReactNode;
  placeholder: string;
  onValueChange: (
    value: string,
    cursorPos: number,
    target: HTMLInputElement | HTMLTextAreaElement
  ) => void;
  onEnterMention: (position: number) => void;
  onDismissMentions: () => void;
  onSelectMention: (position: number, item: MentionableItem) => void;
}

export function MentionMessageField({
  label,
  value,
  textareaRef,
  setTextareaRef,
  mentionAnchor,
  mentionQuery,
  discordMembers,
  discordRoles,
  helperText,
  placeholder,
  onValueChange,
  onEnterMention,
  onDismissMentions,
  onSelectMention,
}: MentionMessageFieldProps) {
  return (
    <Box sx={{ mt: 3, position: "relative" }}>
      <TextField
        fullWidth
        multiline
        rows={8}
        label={label}
        value={value}
        inputRef={(ref) => {
          if (ref) {
            setTextareaRef(ref);
          }
        }}
        onChange={(e) => {
          const cursorPos = e.target.selectionStart || 0;
          onValueChange(e.target.value, cursorPos, e.target);
        }}
        onKeyDown={(e) => {
          if (!mentionAnchor) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            if (e.key === "Escape") {
              onDismissMentions();
            } else if (e.key === "Enter") {
              onEnterMention(mentionAnchor.position);
            }
          }
        }}
        onBlur={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          if (relatedTarget && relatedTarget.closest('[role="listbox"]')) {
            return;
          }
          setTimeout(() => {
            onDismissMentions();
          }, 200);
        }}
        helperText={helperText}
        placeholder={placeholder}
      />
      {mentionAnchor && textareaRef && (
        <MentionSuggestions
          query={mentionQuery}
          anchorEl={mentionAnchor.anchorEl}
          position={mentionAnchor.position}
          discordMembers={discordMembers}
          discordRoles={discordRoles}
          onSelect={onSelectMention}
        />
      )}
    </Box>
  );
}
