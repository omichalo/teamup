"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
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
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import { DEFAULT_CLOSE_MESSAGE, JSON_HEADERS } from "@/components/disponibilites/discord-poll-manager/constants";
import type {
  DiscordConfigState,
  DiscordPoll,
  DiscordPollManagerProps,
  DiscordRole,
  MentionAnchorState,
  MentionableItem,
} from "@/components/disponibilites/discord-poll-manager/types";
import {
  buildDefaultPollMessage,
  filterMentionItems,
} from "@/components/disponibilites/discord-poll-manager/utils";
import { CreatePollDialog } from "@/components/disponibilites/discord-poll-manager/CreatePollDialog";
import { ClosePollDialog } from "@/components/disponibilites/discord-poll-manager/ClosePollDialog";
import { MentionMessageField } from "@/components/disponibilites/discord-poll-manager/MentionMessageField";

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
  const [discordConfig, setDiscordConfig] = useState<DiscordConfigState | null>(
    null
  );
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const { members: discordMembers } = useDiscordMembers();

  // États pour l'autocomplete @ dans le message
  const [mentionMenuAnchor, setMentionMenuAnchor] =
    useState<MentionAnchorState | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [messageTextareaRef, setMessageTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);
  // États pour l'autocomplete @ dans le message de fermeture
  const [closeMentionMenuAnchor, setCloseMentionMenuAnchor] =
    useState<MentionAnchorState | null>(null);
  const [closeMentionQuery, setCloseMentionQuery] = useState("");
  const [closeMessageTextareaRef, setCloseMessageTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);

  // Charger les rôles Discord
  const fetchDiscordRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/discord/roles", {
        method: "GET",
        credentials: "include",
        headers: JSON_HEADERS,
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
            headers: JSON_HEADERS,
          }),
          fetch("/api/discord/channels", {
            method: "GET",
            credentials: "include",
            headers: JSON_HEADERS,
          }),
          fetch("/api/discord/roles", {
            method: "GET",
            credentials: "include",
            headers: JSON_HEADERS,
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
            const role = rolesResult.roles?.find((r: DiscordRole) => r.id === roleId);
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
  const getDefaultCloseMessage = useCallback(() => DEFAULT_CLOSE_MESSAGE, []);

  const getDefaultMessage = useCallback(() => {
    return buildDefaultPollMessage({
      epreuveType,
      propFridayDate,
      propSaturdayDate,
      fridayDate,
      saturdayDate,
      journee,
      date,
    });
  }, [
    epreuveType,
    propFridayDate,
    propSaturdayDate,
    fridayDate,
    saturdayDate,
    journee,
    date,
  ]);

  // Trace des paramètres qui seraient envoyés à l'API à l'ouverture de la popup
  useEffect(() => {
    if (!createDialogOpen) return;

    const displayedMessage = messageTemplate || getDefaultMessage();
    const finalMessageTemplate =
      displayedMessage.trim().length > 0 ? displayedMessage.trim() : undefined;

    const paramsToSend = {
      journee,
      phase,
      championshipType,
      idEpreuve,
      date,
      epreuveType,
      messageTemplate: finalMessageTemplate
        ? `${finalMessageTemplate.length} car.`
        : undefined,
      messageTemplatePreview: finalMessageTemplate
        ? finalMessageTemplate.substring(0, 100) +
          (finalMessageTemplate.length > 100 ? "..." : "")
        : "(vide)",
      fridayDate: fridayDate.trim() || undefined,
      saturdayDate: saturdayDate.trim() || undefined,
    };

    console.log(
      "[DiscordPollManager] Ouverture popup - paramètres qui seraient envoyés à l'API:",
      paramsToSend
    );
  }, [
    createDialogOpen,
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
  ]);

  // Fonction pour insérer une mention dans le message
  const insertMention = useCallback(
    (
      startPos: number,
      member: MentionableItem,
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

  const updateMentionAutocomplete = useCallback(
    (
      value: string,
      cursorPos: number,
      target: HTMLInputElement | HTMLTextAreaElement,
      setQuery: (query: string) => void,
      setAnchor: (anchor: MentionAnchorState | null) => void
    ) => {
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex === -1) {
        setAnchor(null);
        return;
      }

      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setQuery(textAfterAt.toLowerCase());
        setAnchor({
          anchorEl: target,
          position: lastAtIndex,
        });
      } else {
        setAnchor(null);
      }
    },
    []
  );

  const selectFirstMention = useCallback(
    (query: string, position: number, isCloseMessage = false) => {
      const filtered = filterMentionItems({
        discordMembers: discordMembers || [],
        discordRoles,
        query,
      });
      if (filtered.length > 0) {
        insertMention(position, filtered[0], isCloseMessage);
      }
    },
    [discordMembers, discordRoles, insertMention]
  );

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
        headers: JSON_HEADERS,
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
          headers: JSON_HEADERS,
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
      // Envoyer le message affiché dans la popup (ce que l'utilisateur voit = ce qu'on envoie)
      // Ainsi on évite que l'API reconstruise un message vide si fridayDate/saturdayDate manquent
      const displayedMessage = messageTemplate || getDefaultMessage();
      const finalMessageTemplate =
        displayedMessage.trim().length > 0 ? displayedMessage.trim() : undefined;

      const response = await fetch("/api/discord/availability-polls/create", {
        method: "POST",
        credentials: "include",
        headers: JSON_HEADERS,
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
          headers: JSON_HEADERS,
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

      <CreatePollDialog
        open={createDialogOpen}
        creating={creating}
        canCreatePoll={canCreatePoll}
        epreuveType={epreuveType}
        discordConfig={discordConfig}
        journee={journee}
        phase={phase}
        date={date}
        propFridayDate={propFridayDate}
        propSaturdayDate={propSaturdayDate}
        fridayDate={fridayDate}
        saturdayDate={saturdayDate}
        setFridayDate={setFridayDate}
        setSaturdayDate={setSaturdayDate}
        messageField={
          <MentionMessageField
            label="Message qui sera envoyé"
            value={messageTemplate || getDefaultMessage()}
            textareaRef={messageTextareaRef}
            setTextareaRef={setMessageTextareaRef}
            mentionAnchor={mentionMenuAnchor}
            mentionQuery={mentionQuery}
            discordMembers={discordMembers || []}
            discordRoles={discordRoles}
            onValueChange={(value, cursorPos, target) => {
              setMessageTemplate(value);
              updateMentionAutocomplete(
                value,
                cursorPos,
                target,
                setMentionQuery,
                setMentionMenuAnchor
              );
            }}
            onEnterMention={(position) => {
              selectFirstMention(mentionQuery, position);
            }}
            onDismissMentions={() => {
              setMentionMenuAnchor(null);
            }}
            onSelectMention={(position, item) => {
              insertMention(position, item);
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
        }
        onCancel={() => {
          setCreateDialogOpen(false);
          setMessageTemplate("");
          setFridayDate("");
          setSaturdayDate("");
        }}
        onCreate={() => void handleCreatePoll()}
      />

      <ClosePollDialog
        open={closeDialogOpen}
        closing={closing}
        currentPoll={currentPoll}
        discordConfig={discordConfig}
        messageField={
          <MentionMessageField
            label="Message qui sera envoyé"
            value={closeMessageTemplate || getDefaultCloseMessage()}
            textareaRef={closeMessageTextareaRef}
            setTextareaRef={setCloseMessageTextareaRef}
            mentionAnchor={closeMentionMenuAnchor}
            mentionQuery={closeMentionQuery}
            discordMembers={discordMembers || []}
            discordRoles={discordRoles}
            onValueChange={(value, cursorPos, target) => {
              setCloseMessageTemplate(value);
              updateMentionAutocomplete(
                value,
                cursorPos,
                target,
                setCloseMentionQuery,
                setCloseMentionMenuAnchor
              );
            }}
            onEnterMention={(position) => {
              selectFirstMention(closeMentionQuery, position, true);
            }}
            onDismissMentions={() => {
              setCloseMentionMenuAnchor(null);
            }}
            onSelectMention={(position, item) => {
              insertMention(position, item, true);
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
        }
        onCancel={() => {
          setCloseDialogOpen(false);
          setCloseMessageTemplate("");
        }}
        onConfirm={() => void handleConfirmClosePoll()}
      />
    </Box>
  );
}
