import { useState, useEffect, useCallback, useRef } from "react";
import type { Player } from "@/types/team-management";
import type { Match } from "@/types";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { useAppStore } from "@/stores/app-store";
import { useDiscordMembers as useDiscordMembersFromStore } from "@/hooks/useAppData";
import type { DiscordMember } from "@/types/discord";


interface DiscordChannel {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface UseDiscordMessageOptions {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  equipesByType: {
    masculin: EquipeWithMatches[];
    feminin: EquipeWithMatches[];
  };
  locations: Location[];
  cleanTeamName: (teamName: string) => string;
  formatDivision: (division: string) => string;
}

interface UseDiscordMessageResult {
  // États
  sendingDiscord: Record<string, boolean>;
  discordSentStatus: Record<
    string,
    { sent: boolean; sentAt?: string; customMessage?: string }
  >;
  customMessages: Record<string, string>;
  confirmResendDialog: {
    open: boolean;
    teamId: string | null;
    matchInfo: string | null;
    channelId?: string;
  };
  discordMembers: DiscordMember[];
  discordChannels: DiscordChannel[];
  // Fonctions
  sendMessage: (
    teamId: string,
    content: string,
    journee: number | null,
    phase: string | null,
    channelId?: string
  ) => Promise<void>;
  formatMatchInfo: (
    match: Match | null,
    teamPlayers: Player[],
    teamLocationId?: string,
    teamName?: string,
    isFemale?: boolean,
    epreuve?: EpreuveType | null
  ) => string | null;
  insertMention: (
    teamId: string,
    startPos: number,
    member: DiscordMember
  ) => void;
  saveCustomMessage: (
    teamId: string,
    customMessage: string,
    journee: number | null,
    phase: string | null
  ) => Promise<void>;
  setCustomMessages: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setConfirmResendDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      teamId: string | null;
      matchInfo: string | null;
      channelId?: string;
    }>
  >;
  saveTimeoutRef: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
}

/**
 * Hook pour gérer toute la logique Discord (messages, mentions, statuts)
 */
export function useDiscordMessage(
  options: UseDiscordMessageOptions
): UseDiscordMessageResult {
  const {
    selectedJournee,
    selectedPhase,
    equipesByType,
    locations,
    cleanTeamName,
    formatDivision,
  } = options;

  // États
  const [sendingDiscord, setSendingDiscord] = useState<Record<string, boolean>>(
    {}
  );
  const [discordSentStatus, setDiscordSentStatus] = useState<
    Record<string, { sent: boolean; sentAt?: string; customMessage?: string }>
  >({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>(
    {}
  );
  const [confirmResendDialog, setConfirmResendDialog] = useState<{
    open: boolean;
    teamId: string | null;
    matchInfo: string | null;
    channelId?: string;
  }>({ open: false, teamId: null, matchInfo: null });
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Utiliser les membres Discord depuis le store global
  const discordMembers = useDiscordMembersFromStore();
  
  // Utiliser les canaux Discord depuis le store global (chargés par useAppDataLoader)
  const { discordChannels } = useAppStore();

  // Vérifier le statut d'envoi des messages Discord
  useEffect(() => {
    const checkDiscordStatus = async () => {
      if (!selectedJournee || !selectedPhase) return;

      const allTeams = [...equipesByType.masculin, ...equipesByType.feminin];
      if (allTeams.length === 0) return;

      // Un seul appel API pour toutes les équipes
      const teamIds = allTeams.map((equipe) => equipe.team.id).join(",");
      try {
        const response = await fetch(
          `/api/discord/check-message-sent?teamIds=${encodeURIComponent(
            teamIds
          )}&journee=${selectedJournee}&phase=${encodeURIComponent(
            selectedPhase
          )}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.results) {
            const statusMap: Record<
              string,
              { sent: boolean; sentAt?: string; customMessage?: string }
            > = {};
            const customMessagesMap: Record<string, string> = {};

            Object.entries(result.results).forEach(([teamId, status]) => {
              const statusData = status as {
                sent: boolean;
                sentAt?: string;
                customMessage?: string;
              };
              statusMap[teamId] = statusData;
              if (statusData.customMessage) {
                customMessagesMap[teamId] = statusData.customMessage;
              }
            });

            setDiscordSentStatus(statusMap);
            setCustomMessages((prev) => ({ ...prev, ...customMessagesMap }));
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification du statut Discord:",
          error
        );
      }
    };

    void checkDiscordStatus();
  }, [
    selectedJournee,
    selectedPhase,
    equipesByType.masculin,
    equipesByType.feminin,
  ]);

  // Fonction pour sauvegarder le message personnalisé
  const saveCustomMessage = useCallback(
    async (
      teamId: string,
      customMessage: string,
      journee: number | null,
      phase: string | null
    ) => {
      if (!journee || !phase) return;

      try {
        const response = await fetch("/api/discord/update-custom-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            teamId,
            journee,
            phase,
            customMessage,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Mettre à jour l'état local
            setCustomMessages((prev) => ({ ...prev, [teamId]: customMessage }));
            setDiscordSentStatus((prev) => ({
              ...prev,
              [teamId]: { ...prev[teamId], customMessage },
            }));
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde du message personnalisé:",
          error
        );
      }
    },
    []
  );

  // Fonction pour insérer une mention dans le message
  const insertMention = useCallback(
    (
      teamId: string,
      startPos: number,
      member: DiscordMember
    ) => {
      setCustomMessages((prev) => {
        const currentMessage = prev[teamId] || "";
        const textBeforeAt = currentMessage.substring(0, startPos);
        const textAfterAt = currentMessage.substring(startPos);
        // Trouver où se termine la partie à remplacer (jusqu'au prochain espace, saut de ligne ou fin)
        const match = textAfterAt.match(/^@[^\s\n]*/);
        const endPos = startPos + (match ? match[0].length : 1);
        const textAfterMention = currentMessage.substring(endPos);

        const mention = `<@${member.id}>`;
        const newMessage = textBeforeAt + mention + textAfterMention;

        // Sauvegarder immédiatement après l'insertion
        if (selectedJournee && selectedPhase) {
          void saveCustomMessage(
            teamId,
            newMessage,
            selectedJournee,
            selectedPhase
          );
        }

        return { ...prev, [teamId]: newMessage };
      });
    },
    [selectedJournee, selectedPhase, saveCustomMessage]
  );

  // Fonction pour formater le message d'informations du match
  const formatMatchInfo = useCallback(
    (
      match: Match | null,
      teamPlayers: Player[],
      teamLocationId?: string,
      teamName?: string,
      isFemale?: boolean,
      epreuve?: EpreuveType | null
    ): string | null => {
      if (!match) return null;

      const dayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      const matchDate =
        match.date instanceof Date ? match.date : new Date(match.date);
      const dayName = dayNames[matchDate.getDay()];

      // Nettoyer le nom de l'équipe et ajouter "F" pour les équipes féminines
      let cleanName = teamName ? cleanTeamName(teamName) : "";
      if (isFemale && cleanName && !cleanName.endsWith("F")) {
        cleanName = `${cleanName}F`;
      }
      const division = formatDivision(match.division || "");
      const opponent = match.opponent || match.opponentClub || "";

      // Utiliser le lieu de l'équipe (résoudre l'ID en nom depuis la collection locations)
      // Ne jamais utiliser match.location car il peut contenir des données incorrectes
      // On n'affiche rien si le lieu n'est pas trouvé dans la liste des locations
      let location = "";
      if (teamLocationId) {
        const teamLocation = locations.find((l) => l.id === teamLocationId);
        if (teamLocation) {
          location = teamLocation.name;
        }
        // Si le lieu n'est pas trouvé, on laisse location vide (on n'affiche rien)
      }

      const isHome = match.isHome ? "Domicile" : "Extérieur";

      // Pour le championnat de Paris, grouper les joueurs et ajouter le numéro de groupe
      const isParisMatch = epreuve === "championnat_paris";
      let playersList: string;

      if (isParisMatch) {
        // Trier les joueurs par points décroissants
        const sortedPlayers = [...teamPlayers].sort((a, b) => {
          const pointsA = a.points ?? 0;
          const pointsB = b.points ?? 0;
          return pointsB - pointsA; // Décroissant
        });

        // Grouper par 3 et ajouter le numéro de groupe
        const playersWithGroups: string[] = [];
        for (let i = 0; i < sortedPlayers.length; i += 3) {
          const groupNumber = Math.floor(i / 3) + 1;
          const group = sortedPlayers.slice(i, i + 3);
          group.forEach((player) => {
            playersWithGroups.push(
              `🔹 ${player.firstName} ${player.name} (Groupe ${groupNumber})`
            );
          });
        }
        playersList = playersWithGroups.join("\n");
      } else {
        // Pour les autres championnats, affichage normal
        playersList = teamPlayers
          .map((p) => `🔹 ${p.firstName} ${p.name}`)
          .join("\n");
      }

      // Collecter toutes les mentions Discord de tous les joueurs
      // Filtrer uniquement les mentions qui correspondent à des membres existants sur le serveur
      const allDiscordMentions: string[] = [];
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      teamPlayers.forEach((player) => {
        if (player.discordMentions && player.discordMentions.length > 0) {
          // Ajouter uniquement les mentions valides (format <@USER_ID>)
          player.discordMentions.forEach((mentionId) => {
            // Vérifier que l'ID existe encore dans la liste des membres Discord
            if (validMemberIds.has(mentionId)) {
              allDiscordMentions.push(`<@${mentionId}>`);
            }
          });
        }
      });

      // Construire le message avec les mentions Discord si elles existent
      const parts = [
        `${cleanName} – ${division} – ${opponent}`,
        location,
        `${dayName} – ${isHome}`,
        playersList,
      ];

      // Ajouter les mentions Discord après la liste des joueurs
      if (allDiscordMentions.length > 0) {
        parts.push(allDiscordMentions.join(" "));
      }

      return parts.filter(Boolean).join("\n");
    },
    [locations, discordMembers, cleanTeamName, formatDivision]
  );

  // Fonction pour envoyer le message Discord
  const sendMessage = useCallback(
    async (
      teamId: string,
      content: string,
      journee: number | null,
      phase: string | null,
      channelId?: string
    ) => {
      if (!journee || !phase) return;

      setSendingDiscord((prev) => ({ ...prev, [teamId]: true }));
      try {
        const customMessage = customMessages[teamId] || "";
        const response = await fetch("/api/discord/send-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content,
            teamId,
            journee,
            phase,
            customMessage,
            channelId,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Mettre à jour le statut local
            setDiscordSentStatus((prev) => {
              const existing = prev[teamId];
              const newStatus: {
                sent: boolean;
                sentAt: string;
                customMessage?: string;
              } = {
                sent: true,
                sentAt: new Date().toISOString(),
                ...(customMessage || existing?.customMessage
                  ? {
                      customMessage:
                        customMessage || existing?.customMessage || "",
                    }
                  : {}),
              };
              return {
                ...prev,
                [teamId]: newStatus,
              };
            });
          } else {
            const error = await response.json();
            alert(
              `Erreur lors de l'envoi: ${error.error || "Erreur inconnue"}`
            );
          }
        } else {
          const error = await response.json();
          alert(`Erreur lors de l'envoi: ${error.error || "Erreur inconnue"}`);
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message Discord:", error);
        alert("Erreur lors de l'envoi du message Discord");
      } finally {
        setSendingDiscord((prev) => ({ ...prev, [teamId]: false }));
      }
    },
    [customMessages]
  );

  return {
    // États
    sendingDiscord,
    discordSentStatus,
    customMessages,
    confirmResendDialog,
    discordMembers,
    discordChannels,
    // Fonctions
    sendMessage,
    formatMatchInfo,
    insertMention,
    saveCustomMessage,
    setCustomMessages,
    setConfirmResendDialog,
    saveTimeoutRef,
  };
}

