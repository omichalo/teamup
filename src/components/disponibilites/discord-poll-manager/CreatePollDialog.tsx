"use client";

import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { ReactNode } from "react";
import type { DiscordConfigState } from "./types";

interface CreatePollDialogProps {
  open: boolean;
  creating: boolean;
  canCreatePoll: boolean;
  epreuveType: "championnat_equipes" | "championnat_paris" | null | undefined;
  discordConfig: DiscordConfigState | null;
  journee: number | null;
  phase: "aller" | "retour" | null;
  date: string | undefined;
  propFridayDate: string | undefined;
  propSaturdayDate: string | undefined;
  fridayDate: string;
  saturdayDate: string;
  setFridayDate: (value: string) => void;
  setSaturdayDate: (value: string) => void;
  messageField: ReactNode;
  onCancel: () => void;
  onCreate: () => void;
}

export function CreatePollDialog({
  open,
  creating,
  canCreatePoll,
  epreuveType,
  discordConfig,
  journee,
  phase,
  date,
  propFridayDate,
  propSaturdayDate,
  fridayDate,
  saturdayDate,
  setFridayDate,
  setSaturdayDate,
  messageField,
  onCancel,
  onCreate,
}: CreatePollDialogProps) {
  return (
    <Dialog open={open} onClose={() => !creating && onCancel()} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un sondage Discord</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Un sondage sera créé dans le channel Discord configuré pour{" "}
          {epreuveType === "championnat_equipes" ? "le championnat par équipes" : "le championnat de Paris"}. Tous
          les utilisateurs ayant accès à ce channel pourront répondre.
          {discordConfig?.channelId && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Channel: {discordConfig.channelName ? `#${discordConfig.channelName}` : `ID: ${discordConfig.channelId}`}
            </Typography>
          )}
          {!discordConfig?.channelId && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: "warning.main" }}>
              ⚠️ Aucun channel Discord configuré. Configurez-le dans l&apos;administration.
            </Typography>
          )}
        </Alert>

        <Box sx={{ mb: 2, p: 1.5, bgcolor: "background.default", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Informations du sondage
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2">
              <strong>Journée :</strong> {journee || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Phase :</strong> {phase || "—"}
            </Typography>
            {date && (
              <Typography variant="body2">
                <strong>Date :</strong>{" "}
                {new Date(date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            )}
            {discordConfig?.mention && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Mention :</strong> {discordConfig.mentionLabel || discordConfig.mention}
              </Typography>
            )}
          </Box>
        </Box>

        {epreuveType === "championnat_equipes" && (
          <Box sx={{ mt: 3 }}>
            {propFridayDate || propSaturdayDate ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Dates extraites automatiquement depuis les matchs :
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {propFridayDate && (
                    <Typography variant="body2">
                      <strong>Vendredi :</strong> {new Date(propFridayDate).toLocaleDateString("fr-FR")}
                    </Typography>
                  )}
                  {propSaturdayDate && (
                    <Typography variant="body2">
                      <strong>Samedi :</strong> {new Date(propSaturdayDate).toLocaleDateString("fr-FR")}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Dates spécifiques (optionnel)
                </Typography>
                <TextField
                  fullWidth
                  label="Date vendredi"
                  type="date"
                  value={fridayDate}
                  onChange={(e) => setFridayDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                  helperText="Date du vendredi pour le championnat par équipes"
                />
                <TextField
                  fullWidth
                  label="Date samedi"
                  type="date"
                  value={saturdayDate}
                  onChange={(e) => setSaturdayDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Date du samedi pour les rég et équipes filles"
                />
              </>
            )}
          </Box>
        )}

        {messageField}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={onCreate}
          variant="contained"
          disabled={creating || !canCreatePoll}
          startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {creating ? "Création..." : "Créer le sondage"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
