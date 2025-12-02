"use client";

import { Box, TextField, Popper, Paper, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useState, useCallback } from "react";

interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
}

interface MentionSuggestionsProps {
  members: DiscordMember[];
  query: string;
  anchorEl: HTMLElement;
  onSelect: (member: DiscordMember) => void;
}

function MentionSuggestions({
  members,
  query,
  anchorEl,
  onSelect,
}: MentionSuggestionsProps) {
  const filteredMembers = members
    .filter((member) => {
      const searchQuery = query.toLowerCase();
      return (
        member.displayName.toLowerCase().includes(searchQuery) ||
        member.username.toLowerCase().includes(searchQuery)
      );
    })
    .slice(0, 10); // Limiter à 10 résultats

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <Popper
      open={true}
      anchorEl={anchorEl}
      placement="bottom-start"
      sx={{ zIndex: 1300, mt: 0.5 }}
    >
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
          {filteredMembers.map((member) => (
            <ListItem key={member.id} disablePadding>
              <ListItemButton
                onMouseDown={(e) => {
                  // Empêcher le onBlur du TextField de se déclencher
                  e.preventDefault();
                }}
                onClick={() => {
                  onSelect(member);
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
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    mr: 1.5,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {member.displayName.charAt(0).toUpperCase()}
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {member.displayName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      @{member.username}
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

interface DiscordMessageEditorProps {
  teamId: string;
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  discordMembers: DiscordMember[];
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  saveTimeoutRef: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  onInsertMention: (teamId: string, startPos: number, member: DiscordMember) => void;
}

/**
 * Composant pour éditer un message Discord avec support des mentions
 */
export function DiscordMessageEditor(props: DiscordMessageEditorProps) {
  const {
    teamId,
    value,
    onChange,
    onSave,
    discordMembers,
    selectedJournee,
    selectedPhase,
    saveTimeoutRef,
    onInsertMention,
  } = props;

  const [mentionAnchor, setMentionAnchor] = useState<{
    anchorEl: HTMLElement;
    startPos: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Détecter si on tape "@" ou si on est en train de taper après "@"
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Vérifier qu'il n'y a pas d'espace entre "@" et le curseur
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          // On est en train de taper une mention
          const query = textAfterAt.toLowerCase();
          setMentionQuery(query);
          setMentionAnchor({
            anchorEl: e.target,
            startPos: lastAtIndex,
          });
        } else {
          setMentionAnchor(null);
        }
      } else {
        setMentionAnchor(null);
      }

      onChange(newValue);

      // Debounce pour sauvegarder automatiquement après 1 seconde d'inactivité
      if (saveTimeoutRef.current[teamId]) {
        clearTimeout(saveTimeoutRef.current[teamId]);
      }
      saveTimeoutRef.current[teamId] = setTimeout(() => {
        if (selectedJournee && selectedPhase) {
          onSave(newValue);
        }
      }, 1000);
    },
    [onChange, onSave, selectedJournee, selectedPhase, saveTimeoutRef, teamId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionAnchor) {
        const filteredMembers = discordMembers.filter((member) => {
          const query = mentionQuery.toLowerCase();
          return (
            member.displayName.toLowerCase().includes(query) ||
            member.username.toLowerCase().includes(query)
          );
        });

        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "Enter" ||
          e.key === "Escape"
        ) {
          e.preventDefault();
          if (e.key === "Escape") {
            setMentionAnchor(null);
          } else if (e.key === "Enter" && filteredMembers.length > 0) {
            // Insérer la première mention
            const selectedMember = filteredMembers[0];
            onInsertMention(teamId, mentionAnchor.startPos, selectedMember);
            setMentionAnchor(null);
          }
        }
      }
    },
    [mentionAnchor, mentionQuery, discordMembers, teamId, onInsertMention]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Ne pas fermer si on clique sur une suggestion
      // Le onMouseDown de la suggestion empêchera le blur
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (
        relatedTarget &&
        relatedTarget.closest('[role="listbox"]')
      ) {
        return;
      }

      // Délai pour permettre le clic sur une suggestion
      setTimeout(() => {
        setMentionAnchor(null);
        if (selectedJournee && selectedPhase) {
          onSave(value);
        }
      }, 200);
    },
    [onSave, selectedJournee, selectedPhase, value]
  );

  const handleSelectMention = useCallback(
    (member: DiscordMember) => {
      if (mentionAnchor) {
        onInsertMention(teamId, mentionAnchor.startPos, member);
        setMentionAnchor(null);
      }
    },
    [mentionAnchor, teamId, onInsertMention]
  );

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label="Message personnalisé (optionnel)"
        multiline
        rows={3}
        fullWidth
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Tapez @ pour mentionner un membre Discord..."
        size="small"
        helperText="Tapez @ suivi du nom d'un membre pour le mentionner"
      />
      {mentionAnchor && (
        <MentionSuggestions
          members={discordMembers}
          query={mentionQuery}
          anchorEl={mentionAnchor.anchorEl}
          onSelect={handleSelectMention}
        />
      )}
    </Box>
  );
}

