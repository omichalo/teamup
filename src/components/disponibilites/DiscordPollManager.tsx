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
  TextField,
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
  epreuveType?: "championnat_equipes" | "championnat_paris" | null;
  fridayDate?: string;
  saturdayDate?: string;
}

export function DiscordPollManager({
  journee,
  phase,
  championshipType,
  idEpreuve,
  date,
  epreuveType,
  fridayDate: propFridayDate,
  saturdayDate: propSaturdayDate,
}: DiscordPollManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<DiscordPoll | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<string>("");
  // Utiliser les dates passées en props si disponibles, sinon permettre la saisie manuelle
  const [fridayDate, setFridayDate] = useState<string>(propFridayDate || "");
  const [saturdayDate, setSaturdayDate] = useState<string>(
    propSaturdayDate || ""
  );
  const [loadingPoll, setLoadingPoll] = useState(false);

  // Calculer le message par défaut
  const getDefaultMessage = useCallback(() => {
    if (epreuveType === "championnat_equipes") {
      // Utiliser les dates passées en props si disponibles (déjà formatées correctement)
      const fridayLabel = propFridayDate
        ? (() => {
            // Parser la date en évitant les problèmes de timezone
            const [year, month, day] = propFridayDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "numeric",
            });
          })()
        : fridayDate
        ? (() => {
            const [year, month, day] = fridayDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "numeric",
            });
          })()
        : "{fridayDate}";
      const saturdayLabel = propSaturdayDate
        ? (() => {
            const [year, month, day] = propSaturdayDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "numeric",
            });
          })()
        : saturdayDate
        ? (() => {
            const [year, month, day] = saturdayDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "numeric",
            });
          })()
        : "{saturdayDate}";
      return `Bonjour,\n\nProchaine journée de championnat par équipes le ${fridayLabel} (${saturdayLabel} pour les rég et équipes filles).\n\nMerci de me dire si vous êtes disponibles!\n\nPour les filles, merci de préciser vendredi et/ou samedi.`;
    } else {
      const phaseLabel =
        phase === "aller" ? "Aller" : phase === "retour" ? "Retour" : "{phase}";
      const dateLabel = date
        ? new Date(date).toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "{date}";
      return `Bonjour,\n\nProchaine journée de championnat de Paris - Journée ${
        journee || "{journee}"
      }, Phase ${phaseLabel}${
        date ? `, ${dateLabel}` : ""
      }.\n\nMerci de me dire si vous êtes disponibles!`;
    }
  }, [epreuveType, propFridayDate, propSaturdayDate, fridayDate, saturdayDate, phase, journee, date]);

  // Mettre à jour les dates quand les props changent
  useEffect(() => {
    if (propFridayDate) {
      setFridayDate(propFridayDate);
    }
    if (propSaturdayDate) {
      setSaturdayDate(propSaturdayDate);
    }
    // Réinitialiser le messageTemplate quand les dates changent pour utiliser le nouveau message par défaut
    setMessageTemplate("");
  }, [propFridayDate, propSaturdayDate]);

  const fetchCurrentPoll = useCallback(async () => {
    if (journee === null || phase === null || championshipType === null) {
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
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setLoadingPoll(false);
    }
  }, [journee, phase, championshipType, idEpreuve]);

  useEffect(() => {
    void fetchCurrentPoll();
  }, [fetchCurrentPoll]);

  const handleCreatePoll = useCallback(async () => {
    if (journee === null || phase === null || championshipType === null) {
      setError(
        "Veuillez sélectionner une journée, une phase et un championnat"
      );
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // Envoyer le messageTemplate seulement s'il a été modifié (différent du message par défaut)
      const defaultMsg = getDefaultMessage();
      const finalMessageTemplate =
        messageTemplate.trim() && messageTemplate.trim() !== defaultMsg.trim()
          ? messageTemplate.trim()
          : undefined;

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
          epreuveType,
          messageTemplate: finalMessageTemplate,
          fridayDate: fridayDate.trim() || undefined,
          saturdayDate: saturdayDate.trim() || undefined,
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
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setCreating(false);
    }
  }, [
    journee,
    phase,
    championshipType,
    idEpreuve,
    date,
    epreuveType,
    messageTemplate,
    fridayDate,
    saturdayDate,
    getDefaultMessage,
    fetchCurrentPoll,
  ]);

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
      setError(error instanceof Error ? error.message : "Erreur réseau");
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
              <Tooltip
                title={`Channel: ${discordMessageInfo.channelId}, Message: ${discordMessageInfo.messageId}`}
              >
                <Chip
                  label="Voir sur Discord"
                  size="small"
                  icon={<OpenInNewIcon />}
                  onClick={() => {
                    // Ouvrir Discord dans le navigateur
                    // L'utilisateur devra naviguer manuellement vers le channel
                    window.open(
                      `https://discord.com/channels/@me/${discordMessageInfo.channelId}`,
                      "_blank"
                    );
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
                startIcon={
                  closing ? <CircularProgress size={16} /> : <CloseIcon />
                }
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
            Un sondage sera créé dans le channel Discord configuré pour{" "}
            {epreuveType === "championnat_equipes"
              ? "le championnat par équipes"
              : "le championnat de Paris"}
            . Tous les utilisateurs ayant accès à ce channel pourront répondre.
          </Typography>
          <Box>
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
          </Box>

          {epreuveType === "championnat_equipes" && (
            <Box sx={{ mt: 3 }}>
              {propFridayDate || propSaturdayDate ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Dates extraites automatiquement depuis les matchs :
                  {propFridayDate && (
                    <Box component="span" sx={{ ml: 1 }}>
                      Vendredi:{" "}
                      {(() => {
                        // Parser la date en évitant les problèmes de timezone
                        const [year, month, day] = propFridayDate
                          .split("-")
                          .map(Number);
                        const date = new Date(year, month - 1, day);
                        const dayOfWeek = date.getDay();
                        const dayName = date.toLocaleDateString("fr-FR", {
                          weekday: "long",
                        });
                        // Vérifier que c'est bien un vendredi (jour 5)
                        if (dayOfWeek !== 5) {
                          console.warn(
                            `[DiscordPollManager] Date identifiée comme vendredi mais jour de la semaine réel: ${dayName} (${dayOfWeek})`,
                            { date: propFridayDate }
                          );
                        }
                        return `${dayName} ${day}/${month}/${year}`;
                      })()}
                    </Box>
                  )}
                  {propSaturdayDate && (
                    <Box component="span" sx={{ ml: 1 }}>
                      Samedi:{" "}
                      {(() => {
                        const [year, month, day] = propSaturdayDate
                          .split("-")
                          .map(Number);
                        const date = new Date(year, month - 1, day);
                        const dayOfWeek = date.getDay();
                        const dayName = date.toLocaleDateString("fr-FR", {
                          weekday: "long",
                        });
                        // Vérifier que c'est bien un samedi (jour 6)
                        if (dayOfWeek !== 6) {
                          console.warn(
                            `[DiscordPollManager] Date identifiée comme samedi mais jour de la semaine réel: ${dayName} (${dayOfWeek})`,
                            { date: propSaturdayDate }
                          );
                        }
                        return `${dayName} ${day}/${month}/${year}`;
                      })()}
                    </Box>
                  )}
                </Typography>
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

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Message qui sera envoyé"
              value={messageTemplate || getDefaultMessage()}
              onChange={(e) => setMessageTemplate(e.target.value)}
              helperText="Vous pouvez modifier ce message. Variables disponibles: {journee}, {phase}, {championshipType}, {date}, {fridayDate}, {saturdayDate}"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setMessageTemplate("");
              setFridayDate("");
              setSaturdayDate("");
            }}
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
