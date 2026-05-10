"use client";

import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import type { ReactNode } from "react";
import type { DiscordConfigState, DiscordPoll } from "./types";

interface ClosePollDialogProps {
  open: boolean;
  closing: boolean;
  currentPoll: DiscordPoll | null;
  discordConfig: DiscordConfigState | null;
  messageField: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClosePollDialog({
  open,
  closing,
  currentPoll,
  discordConfig,
  messageField,
  onCancel,
  onConfirm,
}: ClosePollDialogProps) {
  return (
    <Dialog open={open} onClose={() => !closing && onCancel()} maxWidth="sm" fullWidth>
      <DialogTitle>Fermer le sondage Discord</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Le sondage sera fermé et les utilisateurs ne pourront plus répondre.
          {currentPoll?.channelId && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Channel: {discordConfig?.channelName ? `#${discordConfig.channelName}` : `ID: ${currentPoll.channelId}`}
            </Typography>
          )}
        </Alert>

        <Box sx={{ mb: 2, p: 1.5, bgcolor: "background.default", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Informations du sondage
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2">
              <strong>Journée :</strong> {currentPoll?.journee || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Phase :</strong> {currentPoll?.phase || "—"}
            </Typography>
            {currentPoll?.date && (
              <Typography variant="body2">
                <strong>Date :</strong>{" "}
                {new Date(currentPoll.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            )}
          </Box>
        </Box>

        {messageField}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={closing}>
          Annuler
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={closing}
          startIcon={closing ? <CircularProgress size={20} /> : <CloseIcon />}
        >
          {closing ? "Fermeture..." : "Fermer le sondage"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
