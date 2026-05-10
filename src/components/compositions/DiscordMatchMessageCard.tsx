"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Close, Message, Send } from "@mui/icons-material";
import { CustomMessageField } from "@/components/compositions/CustomMessageField";
import type { MentionableMember } from "@/components/compositions/MentionSuggestions";
import type { MentionAnchorState } from "@/lib/compositions/mention-autocomplete";
import type { DiscordSentState } from "@/lib/compositions/discord-send";

interface DiscordMatchMessageCardProps {
  teamId: string;
  matchInfo: string;
  channelName: string | undefined;
  hasDiscordChannel: boolean;
  hasLocationConfigured: boolean;
  sentStatus?: DiscordSentState;
  sending: boolean;
  customMessageValue: string;
  mentionAnchor: MentionAnchorState | null;
  mentionQuery: string;
  discordMembers: MentionableMember[];
  onClose: (teamId: string) => void;
  onSend: () => void;
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

export function DiscordMatchMessageCard({
  teamId,
  matchInfo,
  channelName,
  hasDiscordChannel,
  hasLocationConfigured,
  sentStatus,
  sending,
  customMessageValue,
  mentionAnchor,
  mentionQuery,
  discordMembers,
  onClose,
  onSend,
  onChange,
  onKeyDown,
  onBlur,
  onSelectMention,
}: DiscordMatchMessageCardProps) {
  const sendDisabled =
    sending || !matchInfo || !hasDiscordChannel || !hasLocationConfigured;

  const sendTooltip = !hasDiscordChannel
    ? "Aucun canal Discord configure pour cette equipe. Configurez-le dans la page des equipes."
    : !hasLocationConfigured
    ? "Aucun lieu configure pour cette equipe. Configurez-le dans la page des equipes."
    : sentStatus?.sent
    ? "Renvoyer le message sur Discord"
    : "Envoyer le message sur Discord";

  return (
    <Card
      elevation={2}
      sx={{
        minWidth: 300,
        maxWidth: 400,
        borderLeft: "4px solid",
        borderLeftColor: "primary.main",
        backgroundColor: "action.hover",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          pb: 0.5,
          borderBottom: "1px solid",
          borderBottomColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Message fontSize="small" color="primary" />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Message Discord
            </Typography>
            {hasDiscordChannel && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem", fontStyle: "italic" }}
              >
                Canal: #{channelName || "Canal configure"}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {sentStatus?.sent && (
              <Chip
                label="Envoye"
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.65rem" }}
                title={
                  sentStatus.sentAt
                    ? `Envoye le ${new Date(sentStatus.sentAt).toLocaleString("fr-FR")}`
                    : "Message deja envoye"
                }
              />
            )}
            <Tooltip title={sendTooltip}>
              <span>
                <IconButton
                  size="small"
                  onClick={onSend}
                  disabled={sendDisabled}
                  sx={{ p: 0.5 }}
                  color={sentStatus?.sent ? "warning" : "primary"}
                >
                  {sending ? <CircularProgress size={16} /> : <Send fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <IconButton
            size="small"
            onClick={() => onClose(teamId)}
            sx={{ p: 0.5 }}
            title="Fermer le message"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <CardContent sx={{ pt: 1.5, pb: "16px !important" }}>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            lineHeight: 1.8,
            m: 0,
            mb: 2,
            color: "text.primary",
          }}
        >
          {matchInfo}
        </Typography>
        <CustomMessageField
          teamId={teamId}
          value={customMessageValue}
          mentionAnchor={mentionAnchor}
          mentionQuery={mentionQuery}
          discordMembers={discordMembers}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onSelectMention={onSelectMention}
        />
      </CardContent>
    </Card>
  );
}
