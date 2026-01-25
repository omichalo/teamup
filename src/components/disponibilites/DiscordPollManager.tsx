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
  Popper,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { ChampionshipType } from "@/types";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";

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
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<DiscordPoll | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<string>("");
  const [closeMessageTemplate, setCloseMessageTemplate] = useState<string>("");
  // Utiliser les dates passées en props si disponibles, sinon permettre la saisie manuelle
  const [fridayDate, setFridayDate] = useState<string>(propFridayDate || "");
  const [saturdayDate, setSaturdayDate] = useState<string>(
    propSaturdayDate || ""
  );
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [hasActivePoll, setHasActivePoll] = useState(false);
  const [discordConfig, setDiscordConfig] = useState<{
    channelId: string | null;
    mention: string | null;
    channelName?: string | null;
    mentionLabel?: string | null;
  } | null>(null);
  const [discordRoles, setDiscordRoles] = useState<
    Array<{ id: string; name: string; color: number }>
  >([]);
  const { members: discordMembers } = useDiscordMembers();

  // États pour l'autocomplete @ dans le message
  const [mentionMenuAnchor, setMentionMenuAnchor] = useState<{
    anchorEl: HTMLElement;
    position: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [messageTextareaRef, setMessageTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);
  // États pour l'autocomplete @ dans le message de fermeture
  const [closeMentionMenuAnchor, setCloseMentionMenuAnchor] = useState<{
    anchorEl: HTMLElement;
    position: number;
  } | null>(null);
  const [closeMentionQuery, setCloseMentionQuery] = useState("");
  const [closeMessageTextareaRef, setCloseMessageTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);

  // Charger les rôles Discord
  const fetchDiscordRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/discord/roles", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setDiscordRoles(result.roles || []);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des rôles Discord:", error);
    }
  }, []);

  // Charger la configuration Discord
  const fetchDiscordConfig = useCallback(async () => {
    try {
      const [configResponse, channelsResponse, rolesResponse] =
        await Promise.all([
          fetch("/api/admin/discord-availability-config", {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
          fetch("/api/discord/channels", {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
          fetch("/api/discord/roles", {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        ]);

      const configResult = await configResponse.json();
      const channelsResult = await channelsResponse.json();
      const rolesResult = await rolesResponse.json();

      if (configResponse.ok && configResult.success) {
        const isTeamChampionship = epreuveType === "championnat_equipes";
        const channelId = isTeamChampionship
          ? configResult.config?.equipesChannelId || null
          : configResult.config?.parisChannelId || null;
        const mention = isTeamChampionship
          ? configResult.config?.equipesMention || null
          : configResult.config?.parisMention || null;

        // Trouver le nom du channel
        let channelName: string | null = null;
        if (channelId && channelsResponse.ok && channelsResult.success) {
          const channel = channelsResult.channels?.find(
            (c: { id: string; name: string }) => c.id === channelId
          );
          channelName = channel?.name || null;
        }

        // Trouver le libellé de la mention
        let mentionLabel: string | null = null;
        if (mention) {
          const userMatch = mention.match(/^<@(\d+)>$/);
          const roleMatch = mention.match(/^<@&(\d+)>$/);

          if (userMatch && discordMembers) {
            const userId = userMatch[1];
            const member = discordMembers.find((m) => m.id === userId);
            mentionLabel = member ? member.displayName : null;
          } else if (roleMatch && rolesResponse.ok && rolesResult.success) {
            const roleId = roleMatch[1];
            const role = rolesResult.roles?.find(
              (r: { id: string; name: string }) => r.id === roleId
            );
            mentionLabel = role ? `@${role.name}` : null;
          }
        }

        setDiscordConfig({
          channelId,
          mention,
          channelName,
          mentionLabel,
        });
      }

      if (rolesResponse.ok && rolesResult.success) {
        setDiscordRoles(rolesResult.roles || []);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de la config Discord:",
        error
      );
    }
  }, [epreuveType, discordMembers]);

  useEffect(() => {
    if (createDialogOpen) {
      void fetchDiscordConfig();
      void fetchDiscordRoles();
    }
  }, [createDialogOpen, fetchDiscordConfig, fetchDiscordRoles]);

  // Calculer le message par défaut pour la fermeture (sans la mention, elle sera ajoutée automatiquement)
  const getDefaultCloseMessage = useCallback(() => {
    return `Les inscriptions sont terminées pour cette journée.\n\nSi vous voulez vous ajoutez, il faut envoyer un message à Joffrey en privé.`;
  }, []);

  // Calculer le message par défaut (sans la mention, elle sera ajoutée automatiquement)
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
      // Formater la date pour le championnat de Paris : "ce vendredi 24 mai"
      const parisDateLabel = date
        ? (() => {
            const dateObj = new Date(date);
            const weekday = dateObj.toLocaleDateString("fr-FR", {
              weekday: "long",
            });
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString("fr-FR", {
              month: "long",
            });
            return `ce ${weekday} ${day} ${month}`;
          })()
        : "{date}";
      return `Bonjour,\n\nProchaine journée de championnat de Paris - Journée ${
        journee || "{journee}"
      }${date ? ` ${parisDateLabel}` : ""}.\n\nMerci de me dire si vous êtes disponibles!`;
    }
  }, [
    epreuveType,
    propFridayDate,
    propSaturdayDate,
    fridayDate,
    saturdayDate,
    journee,
    date,
  ]);

  // Fonction pour insérer une mention dans le message
  const insertMention = useCallback(
    (
      startPos: number,
      member: {
        id: string;
        username?: string;
        displayName: string;
        name?: string;
        type: "user" | "role";
      },
      isCloseMessage = false
    ) => {
      const mention =
        member.type === "user" ? `<@${member.id}>` : `<@&${member.id}>`;

      if (isCloseMessage) {
        const currentValue = closeMessageTemplate || getDefaultCloseMessage();
        const before = currentValue.substring(0, startPos);
        const after = currentValue.substring(
          startPos + closeMentionQuery.length + 1
        ); // +1 pour le "@"
        const newValue = before + mention + " " + after;

        setCloseMessageTemplate(newValue);
        setCloseMentionMenuAnchor(null);
        setCloseMentionQuery("");
      } else {
        const currentValue = messageTemplate || getDefaultMessage();
        const before = currentValue.substring(0, startPos);
        const after = currentValue.substring(
          startPos + mentionQuery.length + 1
        ); // +1 pour le "@"
        const newValue = before + mention + " " + after;

        setMessageTemplate(newValue);
        setMentionMenuAnchor(null);
        setMentionQuery("");
      }
    },
    [
      messageTemplate,
      closeMessageTemplate,
      getDefaultMessage,
      getDefaultCloseMessage,
      mentionQuery,
      closeMentionQuery,
    ]
  );

  // Composant pour les suggestions de mentions
  const MentionSuggestions = ({
    query,
    anchorEl,
    position,
    isCloseMessage = false,
  }: {
    query: string;
    anchorEl: HTMLElement;
    position: number;
    isCloseMessage?: boolean;
  }) => {
    // Combiner utilisateurs et rôles
    const allMentions = [
      ...(discordMembers || []).map((m) => ({ ...m, type: "user" as const })),
      ...(discordRoles || []).map((r) => ({
        ...r,
        type: "role" as const,
        displayName: r.name,
      })),
    ];

    const filtered = allMentions
      .filter((item) => {
        const searchQuery = query.toLowerCase();
        return (
          item.displayName.toLowerCase().includes(searchQuery) ||
          ("username" in item &&
            item.username.toLowerCase().includes(searchQuery))
        );
      })
      .slice(0, 10);

    if (filtered.length === 0) {
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
            {filtered.map((item) => (
              <ListItem key={`${item.type}-${item.id}`} disablePadding>
                <ListItemButton
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    insertMention(position, item, isCloseMessage);
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
                      backgroundColor:
                        item.type === "user"
                          ? "primary.main"
                          : "secondary.main",
                      color: "primary.contrastText",
                      mr: 1.5,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                    }}
                  >
                    {item.type === "user"
                      ? item.displayName.charAt(0).toUpperCase()
                      : "@"}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500}>
                        {item.type === "user"
                          ? item.displayName
                          : `@${item.displayName}`}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {item.type === "user"
                          ? `@${"username" in item ? item.username : ""}`
                          : "Rôle"}
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
  };

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

  // Vérifier s'il existe un sondage actif pour la combinaison journee/phase/championshipType/idEpreuve actuelle
  const fetchActivePolls = useCallback(async () => {
    // Si on n'a pas les paramètres nécessaires, on ne peut pas vérifier
    if (journee === null || phase === null || championshipType === null) {
      setHasActivePoll(false);
      return;
    }

    try {
      const response = await fetch("/api/discord/availability-polls", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Filtrer les sondages actifs qui correspondent à la combinaison actuelle
        const activePolls = (result.polls || []).filter((poll: DiscordPoll) => {
          if (!poll.isActive) return false;
          // Vérifier si le sondage correspond à la combinaison actuelle
          const matchesJournee = poll.journee === journee;
          const matchesPhase = poll.phase === phase;
          const matchesChampionshipType =
            poll.championshipType === championshipType;
          const matchesIdEpreuve = poll.idEpreuve === idEpreuve;

          return (
            matchesJournee &&
            matchesPhase &&
            matchesChampionshipType &&
            matchesIdEpreuve
          );
        });

        const hasActive = activePolls.length > 0;
        console.log(
          "[DiscordPollManager] fetchActivePolls - Sondages actifs pour cette combinaison:",
          activePolls.length,
          "hasActivePoll:",
          hasActive,
          { journee, phase, championshipType, idEpreuve }
        );
        setHasActivePoll(hasActive);
      } else {
        console.warn(
          "[DiscordPollManager] fetchActivePolls - Erreur dans la réponse:",
          result.error
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification des sondages actifs:",
        error
      );
    }
  }, [journee, phase, championshipType, idEpreuve]);

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
        const poll = result.poll || null;
        setCurrentPoll(poll);
        console.log(
          "[DiscordPollManager] fetchCurrentPoll - Sondage actuel:",
          poll ? { id: poll.id, isActive: poll.isActive } : "null"
        );
        // Si le sondage actuel est actif, on met à jour l'état
        if (poll && poll.isActive) {
          // Le sondage actuel est actif, donc il y a au moins un sondage actif
          console.log(
            "[DiscordPollManager] fetchCurrentPoll - Sondage actif détecté, setHasActivePoll(true)"
          );
          setHasActivePoll(true);
        } else {
          // Le sondage actuel n'existe pas ou est fermé, vérifier s'il y a d'autres sondages actifs
          console.log(
            "[DiscordPollManager] fetchCurrentPoll - Sondage fermé ou inexistant, vérification des autres sondages actifs"
          );
          await fetchActivePolls();
        }
      } else {
        setError(result.error || "Erreur lors de la récupération du sondage");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setLoadingPoll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchActivePolls is called conditionally, not a direct dependency
  }, [journee, phase, championshipType, idEpreuve]);

  useEffect(() => {
    // Charger les sondages actifs au chargement initial
    void fetchActivePolls();
  }, [fetchActivePolls]);

  useEffect(() => {
    // Charger le sondage actuel au chargement initial
    // fetchCurrentPoll appellera fetchActivePolls si le sondage actuel est fermé
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
        await fetchActivePolls();
      } else {
        // Afficher l'erreur retournée par l'API
        const errorMessage =
          result.error || "Erreur lors de la création du sondage";
        setError(errorMessage);
        console.error(
          "[DiscordPollManager] Erreur lors de la création du sondage:",
          errorMessage,
          result
        );
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
    fetchActivePolls,
  ]);

  const handleClosePoll = useCallback(() => {
    if (!currentPoll) return;
    // Ouvrir la pop-in de fermeture au lieu de window.confirm
    setCloseDialogOpen(true);
    // Initialiser le message par défaut si vide
    if (!closeMessageTemplate) {
      setCloseMessageTemplate(getDefaultCloseMessage());
    }
  }, [currentPoll, closeMessageTemplate, getDefaultCloseMessage]);

  const handleConfirmClosePoll = useCallback(async () => {
    if (!currentPoll) return;

    setClosing(true);
    setError(null);
    setSuccess(null);

    try {
      // Envoyer le messageTemplate seulement s'il a été modifié (différent du message par défaut)
      const defaultCloseMsg = getDefaultCloseMessage();
      const finalCloseMessageTemplate =
        closeMessageTemplate.trim() &&
        closeMessageTemplate.trim() !== defaultCloseMsg.trim()
          ? closeMessageTemplate.trim()
          : undefined;

      const response = await fetch(
        `/api/discord/availability-polls/${currentPoll.id}/close`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageTemplate: finalCloseMessageTemplate,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Sondage fermé avec succès");
        setCloseDialogOpen(false);
        setCloseMessageTemplate("");
        // Mettre à jour le sondage actuel d'abord
        await fetchCurrentPoll();
        // Vérifier immédiatement les sondages actifs
        await fetchActivePolls();
      } else {
        setError(result.error || "Erreur lors de la fermeture du sondage");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setClosing(false);
    }
  }, [
    currentPoll,
    closeMessageTemplate,
    getDefaultCloseMessage,
    fetchCurrentPoll,
    fetchActivePolls,
  ]);

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
          disabled={!canCreatePoll || creating || hasActivePoll}
          title={
            hasActivePoll
              ? "Un sondage actif existe déjà. Veuillez fermer le sondage existant avant d'en créer un nouveau."
              : undefined
          }
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
          <Alert severity="info" sx={{ mb: 2 }}>
            Un sondage sera créé dans le channel Discord configuré pour{" "}
            {epreuveType === "championnat_equipes"
              ? "le championnat par équipes"
              : "le championnat de Paris"}
            . Tous les utilisateurs ayant accès à ce channel pourront répondre.
            {discordConfig?.channelId && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Channel:{" "}
                {discordConfig.channelName
                  ? `#${discordConfig.channelName}`
                  : `ID: ${discordConfig.channelId}`}
          </Typography>
            )}
            {!discordConfig?.channelId && (
              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1, color: "warning.main" }}
              >
                ⚠️ Aucun channel Discord configuré. Configurez-le dans
                l&apos;administration.
              </Typography>
            )}
          </Alert>

          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: "background.default",
              borderRadius: 1,
            }}
          >
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
                  <strong>Mention :</strong>{" "}
                  {discordConfig.mentionLabel || discordConfig.mention}
              </Typography>
            )}
            </Box>
          </Box>

          {epreuveType === "championnat_equipes" && (
            <Box sx={{ mt: 3 }}>
              {propFridayDate || propSaturdayDate ? (
                <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                    sx={{ mb: 1 }}
                >
                  Dates extraites automatiquement depuis les matchs :
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                  {propFridayDate && (
                      <Typography variant="body2">
                        <strong>Vendredi :</strong>{" "}
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
                      </Typography>
                  )}
                  {propSaturdayDate && (
                      <Typography variant="body2">
                        <strong>Samedi :</strong>{" "}
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

          <Box sx={{ mt: 3, position: "relative" }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Message qui sera envoyé"
              value={messageTemplate || getDefaultMessage()}
              inputRef={(ref) => {
                if (ref) {
                  setMessageTextareaRef(ref);
                }
              }}
              onChange={(e) => {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart || 0;
                setMessageTemplate(value);

                // Détecter si on tape "@" ou si on est en train de taper après "@"
                const textBeforeCursor = value.substring(0, cursorPos);
                const lastAtIndex = textBeforeCursor.lastIndexOf("@");

                if (lastAtIndex !== -1) {
                  // Vérifier qu'il n'y a pas d'espace entre "@" et le curseur
                  const textAfterAt = textBeforeCursor.substring(
                    lastAtIndex + 1
                  );
                  if (
                    !textAfterAt.includes(" ") &&
                    !textAfterAt.includes("\n")
                  ) {
                    // On est en train de taper une mention
                    const query = textAfterAt.toLowerCase();
                    setMentionQuery(query);
                    setMentionMenuAnchor({
                      anchorEl: e.target,
                      position: lastAtIndex,
                    });
                  } else {
                    setMentionMenuAnchor(null);
                  }
                } else {
                  setMentionMenuAnchor(null);
                }
              }}
              onKeyDown={(e) => {
                if (mentionMenuAnchor) {
                  const allMentions = [
                    ...(discordMembers || []).map((m) => ({
                      ...m,
                      type: "user" as const,
                    })),
                    ...(discordRoles || []).map((r) => ({
                      ...r,
                      type: "role" as const,
                      displayName: r.name,
                    })),
                  ];

                  const filtered = allMentions
                    .filter((item) => {
                      const searchQuery = mentionQuery.toLowerCase();
                      return (
                        item.displayName.toLowerCase().includes(searchQuery) ||
                        ("username" in item &&
                          item.username.toLowerCase().includes(searchQuery))
                      );
                    })
                    .slice(0, 10);

                  if (
                    e.key === "ArrowDown" ||
                    e.key === "ArrowUp" ||
                    e.key === "Enter" ||
                    e.key === "Escape"
                  ) {
                    e.preventDefault();
                    if (e.key === "Escape") {
                      setMentionMenuAnchor(null);
                    } else if (e.key === "Enter" && filtered.length > 0) {
                      // Insérer la première mention
                      const selectedMention = filtered[0];
                      insertMention(
                        mentionMenuAnchor.position,
                        selectedMention
                      );
                    }
                  }
                }
              }}
              onBlur={(e) => {
                // Ne pas fermer si on clique sur une suggestion
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                if (
                  relatedTarget &&
                  relatedTarget.closest('[role="listbox"]')
                ) {
                  return;
                }
                // Délai pour permettre le clic sur une suggestion
                setTimeout(() => {
                  setMentionMenuAnchor(null);
                }, 200);
              }}
              helperText={
                <>
                  Vous pouvez modifier ce message.
                  <br />
                  Tapez <strong>@</strong> pour mentionner un utilisateur ou un
                  rôle Discord.
                  {discordConfig?.mention && (
                    <>
                      <br />
                      <strong>Note :</strong> La mention{" "}
                      {discordConfig.mentionLabel || discordConfig.mention} sera
                      automatiquement ajoutée au début du message envoyé sur
                      Discord.
                    </>
                  )}
                </>
              }
              placeholder="Le message par défaut sera utilisé si ce champ est vide"
            />
            {mentionMenuAnchor && messageTextareaRef && (
              <MentionSuggestions
                query={mentionQuery}
                anchorEl={mentionMenuAnchor.anchorEl}
                position={mentionMenuAnchor.position}
              />
            )}
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

      {/* Dialog de fermeture */}
      <Dialog
        open={closeDialogOpen}
        onClose={() => !closing && setCloseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Fermer le sondage Discord</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Le sondage sera fermé et les utilisateurs ne pourront plus répondre.
            {currentPoll?.channelId && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Channel:{" "}
                {discordConfig?.channelName
                  ? `#${discordConfig.channelName}`
                  : `ID: ${currentPoll.channelId}`}
              </Typography>
            )}
          </Alert>

          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: "background.default",
              borderRadius: 1,
            }}
          >
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

          <Box sx={{ mt: 3, position: "relative" }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Message qui sera envoyé"
              value={closeMessageTemplate || getDefaultCloseMessage()}
              inputRef={(ref) => {
                if (ref) {
                  setCloseMessageTextareaRef(ref);
                }
              }}
              onChange={(e) => {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart || 0;
                setCloseMessageTemplate(value);

                // Détecter si on tape "@" ou si on est en train de taper après "@"
                const textBeforeCursor = value.substring(0, cursorPos);
                const lastAtIndex = textBeforeCursor.lastIndexOf("@");

                if (lastAtIndex !== -1) {
                  // Vérifier qu'il n'y a pas d'espace entre "@" et le curseur
                  const textAfterAt = textBeforeCursor.substring(
                    lastAtIndex + 1
                  );
                  if (
                    !textAfterAt.includes(" ") &&
                    !textAfterAt.includes("\n")
                  ) {
                    // On est en train de taper une mention
                    const query = textAfterAt.toLowerCase();
                    setCloseMentionQuery(query);
                    setCloseMentionMenuAnchor({
                      anchorEl: e.target,
                      position: lastAtIndex,
                    });
                  } else {
                    setCloseMentionMenuAnchor(null);
                  }
                } else {
                  setCloseMentionMenuAnchor(null);
                }
              }}
              onKeyDown={(e) => {
                if (closeMentionMenuAnchor) {
                  const allMentions = [
                    ...(discordMembers || []).map((m) => ({
                      ...m,
                      type: "user" as const,
                    })),
                    ...(discordRoles || []).map((r) => ({
                      ...r,
                      type: "role" as const,
                      displayName: r.name,
                    })),
                  ];

                  const filtered = allMentions
                    .filter((item) => {
                      const searchQuery = closeMentionQuery.toLowerCase();
                      return (
                        item.displayName.toLowerCase().includes(searchQuery) ||
                        ("username" in item &&
                          item.username.toLowerCase().includes(searchQuery))
                      );
                    })
                    .slice(0, 10);

                  if (
                    e.key === "ArrowDown" ||
                    e.key === "ArrowUp" ||
                    e.key === "Enter" ||
                    e.key === "Escape"
                  ) {
                    e.preventDefault();
                    if (e.key === "Escape") {
                      setCloseMentionMenuAnchor(null);
                    } else if (e.key === "Enter" && filtered.length > 0) {
                      // Insérer la première mention
                      const selectedMention = filtered[0];
                      insertMention(
                        closeMentionMenuAnchor.position,
                        selectedMention,
                        true
                      );
                    }
                  }
                }
              }}
              onBlur={(e) => {
                // Ne pas fermer si on clique sur une suggestion
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                if (
                  relatedTarget &&
                  relatedTarget.closest('[role="listbox"]')
                ) {
                  return;
                }
                // Délai pour permettre le clic sur une suggestion
                setTimeout(() => {
                  setCloseMentionMenuAnchor(null);
                }, 200);
              }}
              helperText={
                <>
                  Vous pouvez modifier ce message.
                  <br />
                  Tapez <strong>@</strong> pour mentionner un utilisateur ou un
                  rôle Discord.
                </>
              }
              placeholder="Le message par défaut sera utilisé si ce champ est vide"
            />
            {closeMentionMenuAnchor && closeMessageTextareaRef && (
              <MentionSuggestions
                query={closeMentionQuery}
                anchorEl={closeMentionMenuAnchor.anchorEl}
                position={closeMentionMenuAnchor.position}
                isCloseMessage={true}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCloseDialogOpen(false);
              setCloseMessageTemplate("");
            }}
            disabled={closing}
          >
            Annuler
          </Button>
          <Button
            onClick={() => void handleConfirmClosePoll()}
            variant="contained"
            color="error"
            disabled={closing}
            startIcon={closing ? <CircularProgress size={20} /> : <CloseIcon />}
          >
            {closing ? "Fermeture..." : "Fermer le sondage"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
