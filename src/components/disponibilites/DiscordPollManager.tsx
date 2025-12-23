"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { ChampionshipType } from "@/types";

interface DiscordPoll {
  id: string;
  messageId: string;
  channelId: string;
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
  date?: string;
  isActive: boolean;
  closedAt?: string | null;
  createdAt?: string | null;
  createdBy: string;
}

interface DiscordPollManagerProps {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType | null;
  idEpreuve?: number;
  date?: string;
}

export function DiscordPollManager({
  journee,
  phase,
  championshipType,
  idEpreuve,
  date,
}: DiscordPollManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<DiscordPoll | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(false);

  const fetchCurrentPoll = useCallback(async () => {
    if (
      journee === null ||
      phase === null ||
      championshipType === null
    ) {
      setCurrentPoll(null);
      return;
    }

    setLoadingPoll(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        journee: journee.toString(),
        phase,
        championshipType,
      });
      if (idEpreuve !== undefined) {
        params.append("idEpreuve", idEpreuve.toString());
      }

      const response = await fetch(
        `/api/discord/availability-polls?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentPoll(result.poll || null);
      } else {
        setError(result.error || "Erreur lors de la récupération du sondage");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erreur réseau"
      );
    } finally {
      setLoadingPoll(false);
    }
  }, [journee, phase, championshipType, idEpreuve]);

  useEffect(() => {
    void fetchCurrentPoll();
  }, [fetchCurrentPoll]);

  const handleCreatePoll = useCallback(async () => {
    if (
      journee === null ||
      phase === null ||
      championshipType === null
    ) {
      setError("Veuillez sélectionner une journée, une phase et un championnat");
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/discord/availability-polls/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journee,
          phase,
          championshipType,
          idEpreuve,
          date,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Sondage créé avec succès sur Discord");
        setCreateDialogOpen(false);
        await fetchCurrentPoll();
      } else {
        setError(result.error || "Erreur lors de la création du sondage");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erreur réseau"
      );
    } finally {
      setCreating(false);
    }
  }, [journee, phase, championshipType, idEpreuve, date, fetchCurrentPoll]);

  const handleClosePoll = useCallback(async () => {
    if (!currentPoll) return;

    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir fermer ce sondage ? Les utilisateurs ne pourront plus répondre."
      )
    ) {
      return;
    }

    setClosing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/discord/availability-polls/${currentPoll.id}/close`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Sondage fermé avec succès");
        await fetchCurrentPoll();
      } else {
        setError(result.error || "Erreur lors de la fermeture du sondage");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erreur réseau"
      );
    } finally {
      setClosing(false);
    }
  }, [currentPoll, fetchCurrentPoll]);

  const canCreatePoll =
    journee !== null && phase !== null && championshipType !== null;

  // Construire l'URL du message Discord
  // Format: https://discord.com/channels/{guildId}/{channelId}/{messageId}
  // Note: On ne peut pas construire l'URL complète sans le guildId, donc on utilise juste le channelId et messageId
  // L'utilisateur devra naviguer manuellement ou on pourra ajouter une variable d'environnement publique plus tard
  // L'URL Discord nécessite le serverId, on ne peut pas la construire côté client
  // On affichera juste le channelId et messageId, ou on pourra créer une route API pour obtenir l'URL complète
  const discordMessageInfo = currentPoll
    ? {
        channelId: currentPoll.channelId,
        messageId: currentPoll.messageId,
      }
    : null;

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={!canCreatePoll || creating}
        >
          Créer sondage Discord
        </Button>

        {loadingPoll ? (
          <CircularProgress size={20} />
        ) : currentPoll ? (
          <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={currentPoll.isActive ? <CheckCircleIcon /> : <CancelIcon />}
              label={currentPoll.isActive ? "Sondage actif" : "Sondage fermé"}
              color={currentPoll.isActive ? "success" : "default"}
              size="small"
            />
            {discordMessageInfo && (
              <Tooltip title={`Channel: ${discordMessageInfo.channelId}, Message: ${discordMessageInfo.messageId}`}>
                <Chip
                  label="Voir sur Discord"
                  size="small"
                  icon={<OpenInNewIcon />}
                  onClick={() => {
                    // Ouvrir Discord dans le navigateur
                    // L'utilisateur devra naviguer manuellement vers le channel
                    window.open(`https://discord.com/channels/@me/${discordMessageInfo.channelId}`, "_blank");
                  }}
                  clickable
                />
              </Tooltip>
            )}
            {currentPoll.isActive && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void handleClosePoll()}
                disabled={closing}
                startIcon={closing ? <CircularProgress size={16} /> : <CloseIcon />}
              >
                Fermer le sondage
              </Button>
            )}
          </Box>
        ) : null}
      </Box>

      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Créer un sondage Discord</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Un sondage sera créé dans le channel Discord configuré pour le
            championnat de Paris. Tous les utilisateurs ayant accès à ce channel
            pourront répondre.
          </Typography>
          <Box>
            <Typography variant="body2">
              <strong>Journée :</strong> {journee || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Phase :</strong> {phase || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Championnat :</strong>{" "}
              {championshipType === "masculin" ? "Masculin" : "Féminin"}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Annuler
          </Button>
          <Button
            onClick={() => void handleCreatePoll()}
            variant="contained"
            disabled={creating || !canCreatePoll}
            startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {creating ? "Création..." : "Créer le sondage"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

