"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useTeamData, type EquipeWithMatches } from "@/hooks/useTeamData";
import { usePlayers } from "@/hooks/usePlayers";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import { CompositionService } from "@/lib/services/composition-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { Player } from "@/types/team-management";
import { ChampionshipType, Match } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { divisionIndicatesPhase2 } from "@/lib/shared/fftt-utils";
import {
  EpreuveType,
  getMatchEpreuve,
  isParisEpreuve,
} from "@/lib/shared/epreuve-utils";
import { useJourneesData } from "@/hooks/useJourneesData";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  getMatchForTeamAndJournee,
  isMatchPlayed,
  validateTeamCompositionState,
  getParisTeamStructure,
  isParisChampionship,
} from "@/lib/compositions/validators";
import {
  getTeamsByType,
} from "@/lib/compositions/championship-utils";
import { AvailablePlayersSection } from "@/components/compositions/AvailablePlayersSection";
import {
  CompositionRulesHelp,
  type CompositionRuleItem,
} from "@/components/compositions/CompositionRulesHelp";
import { CompositionsView } from "@/components/compositions/views/CompositionsView";
import { usePhasePreselect } from "@/hooks/usePhasePreselect";
import { useCompositionAssignments } from "@/hooks/useCompositionAssignments";
import { useCompositionsConfirmationDialog } from "@/hooks/useCompositionsConfirmationDialog";
import { useCompositionsRealtimeSync } from "@/hooks/useCompositionsRealtimeSync";
import { useCompositionsStaticData } from "@/hooks/useCompositionsStaticData";
import { useDefaultCompositions } from "@/hooks/useDefaultCompositions";
import { ConfirmationDialog } from "@/components/compositions/dialogs/ConfirmationDialog";
import {
  CompositionsResendDialog,
  type ConfirmResendDialogState,
} from "@/components/compositions/dialogs/CompositionsResendDialog";
import { AvailablePlayerListItem } from "@/components/compositions/AvailablePlayerListItem";
import { CompositionsFiltersCard } from "@/components/compositions/CompositionsFiltersCard";
import { SelectionPromptCard } from "@/components/compositions/SelectionPromptCard";
import { CompositionsHeader } from "@/components/compositions/CompositionsHeader";
import { CompositionsActionsBar } from "@/components/compositions/CompositionsActionsBar";
import { CompositionsSummaryTabs } from "@/components/compositions/CompositionsSummaryTabs";
import { CompositionsWorkspace } from "@/components/compositions/CompositionsWorkspace";
import { TeamCompositionRow } from "@/components/compositions/TeamCompositionRow";
import { buildDiscordMatchInfo } from "@/lib/compositions/discord-message";
import {
  buildSentStatusUpdate,
  sendDiscordMessage,
} from "@/lib/compositions/discord-send";
import {
  persistCustomMessage,
  scheduleDebouncedTeamSave,
} from "@/lib/compositions/custom-message";
import {
  applyDefaultCompositionsBatch,
  resetCompositionsBatch,
} from "@/lib/compositions/composition-batch-operations";
import {
  computeMentionAutocompleteState,
  filterMentionMembers,
  isMentionNavigationKey,
} from "@/lib/compositions/mention-autocomplete";

export function CompositionsPageContainer() {
  const { equipes, loading: loadingEquipes, currentPhase } = useTeamData();
  const { players, loading: loadingPlayers } = usePlayers();
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType | null>(
    null
  );
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  // État pour stocker les compositions : Map<teamId, playerIds[]>
  const [compositions, setCompositions] = useState<Record<string, string[]>>(
    {}
  );
  // État pour la recherche de joueurs
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [teamValidationErrors, setTeamValidationErrors] = useState<
    Record<
      string,
      { reason: string; offendingPlayerIds?: string[] } | undefined
    >
  >({});
  // État pour gérer l'affichage du message d'informations du match par équipe
  const [showMatchInfo, setShowMatchInfo] = useState<Record<string, boolean>>(
    {}
  );
  const [sendingDiscord, setSendingDiscord] = useState<Record<string, boolean>>(
    {}
  );
  const [discordSentStatus, setDiscordSentStatus] = useState<
    Record<string, { sent: boolean; sentAt?: string; customMessage?: string }>
  >({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>(
    {}
  );
  const [confirmResendDialog, setConfirmResendDialog] = useState<ConfirmResendDialogState>({
    open: false,
    teamId: null,
    matchInfo: null,
  });
  const { members: discordMembers } = useDiscordMembers();
  const [mentionAnchor, setMentionAnchor] = useState<{
    teamId: string;
    anchorEl: HTMLElement;
    startPos: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const saveTimeoutRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fonction helper pour vérifier le statut Discord d'un joueur
  const getDiscordStatus = useCallback(
    (player: Player): "none" | "invalid" | "valid" => {
      if (!player.discordMentions || player.discordMentions.length === 0) {
        return "none";
      }
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      const hasInvalidMention = player.discordMentions.some(
        (mentionId) => !validMemberIds.has(mentionId)
      );
      return hasInvalidMention ? "invalid" : "valid";
    },
    [discordMembers]
  );

  const compositionService = useMemo(() => new CompositionService(), []);
  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );
  const { locations, discordChannels } = useCompositionsStaticData();
  const {
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
  } = useDefaultCompositions({
    selectedPhase,
    compositionDefaultsService,
  });

  const availablePlayersSubtitle = useMemo(() => {
    const base = tabValue === 0 ? "Masculin" : "Féminin";
    if (selectedJournee) {
      return `${base} - Journée ${selectedJournee}`;
    }
    return base;
  }, [tabValue, selectedJournee]);

  const compositionRules: CompositionRuleItem[] = useMemo(() => {
    if (isParisEpreuve(selectedEpreuve)) {
      // Règles spécifiques au championnat de Paris
      return [
        {
          id: "paris-structure",
          label:
            "Structure par groupes : 3 groupes de 3 joueurs (Excellence, Promo Excellence, Honneur), 2 groupes de 3 (Division 1), 1 groupe de 3 (Division 2)",
          scope: "both",
        },
        {
          id: "paris-article8",
          label:
            "Article 8 : Les joueurs du groupe 2 doivent avoir des points entre le max du groupe 1 et le min du groupe 3. Permutation possible dans un même groupe.",
          scope: "both",
        },
        {
          id: "paris-article12",
          label:
            "Article 12 : Maximum 1 joueur brûlé par groupe de 3. Si 2 joueurs brûlés dans un même groupe, les 2 sont non qualifiés.",
          scope: "both",
        },
        {
          id: "paris-burning",
          label:
            "Brûlage : Un joueur est brûlé s'il a joué 3 matchs ou plus dans UNE équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
          scope: "both",
        },
        {
          id: "paris-mixte",
          label:
            "Championnat mixte : pas de distinction masculin/féminin, une seule phase",
          scope: "both",
        },
      ];
    }

    // Règles pour le championnat par équipes
    return [
      {
        id: "maxPlayersDaily",
        label: "Une composition de journée ne peut aligner que 4 joueurs",
        scope: "daily",
      },
      {
        id: "maxPlayersDefaults",
        label: "Une composition par défaut peut contenir jusqu'à 5 joueurs",
        scope: "defaults",
      },
      {
        id: "foreign",
        label: "Maximum un joueur étranger (ETR) par équipe",
        scope: "both",
      },
      {
        id: "female-in-male",
        label: "Une équipe masculine ne peut comporter plus de deux joueuses",
        scope: "both",
      },
      {
        id: "burning",
        label:
          "Brûlage : Un joueur est brûlé s'il a joué 2 matchs ou plus dans une équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
        scope: "both",
      },
      {
        id: "fftt",
        label:
          "Points minimum selon division : Messieurs N1 (≥1800), N2 (≥1600), N3 (≥1400) | Dames N1 (≥1100), N2 (≥900 pour 2 sur 4)",
        scope: "both",
      },
      {
        id: "journee2",
        label:
          "Journée 2 : au plus un joueur ayant joué la J1 dans une équipe de numéro inférieur",
        scope: "daily",
        description:
          "Cette règle ne s'applique que sur la page des compositions de journée lorsque la J2 est sélectionnée.",
      },
    ];
  }, [selectedEpreuve]);

  // Déterminer la phase en cours
  // Grouper les équipes par type (masculin/féminin)
  // Filtrer les équipes selon l'épreuve sélectionnée et la phase (Phase 1 pour aller, Phase 2 pour retour)
  const filteredEquipes = useMemo(() => {
    if (!selectedEpreuve) {
      return equipes;
    }
    return equipes.filter((equipe) => {
      const epreuve = getMatchEpreuve(equipe.matches[0] || {}, equipe.team);
      if (epreuve !== selectedEpreuve) return false;
      if (selectedEpreuve !== "championnat_equipes") return true;
      const division = equipe.team.division ?? "";
      // Aller : afficher uniquement les équipes dont la division n'indique pas Phase 2.
      // Retour : afficher uniquement les équipes dont la division indique explicitement Phase 2
      // (évite d'afficher des équipes Phase 1 ou sans phase dans le libellé).
      if (selectedPhase === "aller") return !divisionIndicatesPhase2(division);
      if (selectedPhase === "retour") return divisionIndicatesPhase2(division);
      return true;
    });
  }, [equipes, selectedEpreuve, selectedPhase]);

  const {
    journeesByPhase,
    defaultEpreuve,
    hasDataForEpreuve,
  } = useJourneesData(equipes, selectedEpreuve, selectedPhase);

  const journeeMenuOptions = useMemo(() => {
    const phaseToUse = isParisEpreuve(selectedEpreuve) ? "aller" : selectedPhase;
    if (!phaseToUse) {
      return [];
    }

    const journeesArray = Array.from(
      journeesByPhase.get(phaseToUse)?.values() || []
    ) as Array<{
      journee: number;
      phase: "aller" | "retour";
      dates: Date[];
    }>;

    return journeesArray
      .sort((a, b) => a.journee - b.journee)
      .map(({ journee, dates }) => {
        const datesFormatted = dates
          .map((date) =>
            new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            }).format(date)
          )
          .join(", ");

        return {
          journee,
          label: `Journée ${journee} - ${datesFormatted}`,
        };
      });
  }, [journeesByPhase, selectedEpreuve, selectedPhase]);

  // Initialiser selectedEpreuve avec l'épreuve par défaut
  // Utiliser une ref pour suivre si on a déjà initialisé une fois
  const hasInitializedEpreuve = React.useRef(false);

  useEffect(() => {
    if (!hasInitializedEpreuve.current && hasDataForEpreuve(defaultEpreuve)) {
      setSelectedEpreuve(defaultEpreuve);
      hasInitializedEpreuve.current = true;
    }
  }, [defaultEpreuve, hasDataForEpreuve, selectedEpreuve, setSelectedEpreuve]);

  usePhasePreselect({
    equipes,
    loadingEquipes,
    currentPhase,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  });

  // Initialiser selectedJournee avec la première journée dont la date de début est après aujourd'hui
  useEffect(() => {
    // Pour le championnat de Paris, utiliser "aller" comme phase par défaut
    const phaseToUse =
      isParisEpreuve(selectedEpreuve) ? "aller" : selectedPhase;

    if (
      selectedEpreuve === null ||
      phaseToUse === null ||
      !journeesByPhase.has(phaseToUse)
    ) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const journees = Array.from(
      journeesByPhase.get(phaseToUse)?.values() || []
    ) as Array<{ journee: number; phase: "aller" | "retour"; dates: Date[] }>;

    // Trouver la prochaine journée basée sur la date de début (minimum)
    const nextJournee = journees
      .sort((a, b) => a.journee - b.journee)
      .find(({ dates }) => {
        if (dates.length === 0) return false;
        const debutJournee = new Date(
          Math.min(...dates.map((d: Date) => d.getTime()))
        );
        debutJournee.setHours(0, 0, 0, 0);
        return debutJournee >= now;
      });

    if (nextJournee) {
      setSelectedJournee(nextJournee.journee);
    } else if (journees.length > 0) {
      // Si aucune journée future, prendre la dernière
      const lastJournee = journees.sort((a, b) => b.journee - a.journee)[0];
      setSelectedJournee(lastJournee.journee);
    }
  }, [selectedPhase, selectedEpreuve, journeesByPhase]);

  // Fonction helper pour calculer le maxPlayers selon l'épreuve et la division
  const getMaxPlayersForTeam = useCallback(
    (equipe: EquipeWithMatches): number => {
      // Vérifier directement si l'équipe fait partie du championnat de Paris
      if (isParisChampionship(equipe)) {
        const structure = getParisTeamStructure(equipe.team.division || "");
        return structure?.totalPlayers || 4; // Fallback à 4 si structure non reconnue
      }
      // Vérifier si c'est une équipe pré-régionale féminine (format: DXX_Pre-Regionale Dames)
      const division = equipe.team.division || "";
      const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
      if (division.match(/Pre-Regionale/i) && isFemaleTeam) {
        return 3; // Pré-régionale féminine : 3 joueurs
      }
      return 4; // Championnat par équipes : 4 joueurs par défaut
    },
    []
  );

  const {
    availabilities,
    availabilitiesLoaded,
    availablePlayers,
  } = useCompositionsRealtimeSync({
    selectedJournee,
    selectedPhase,
    selectedEpreuve,
    tabValue,
    players,
    equipes,
    defaultCompositions,
    defaultCompositionsLoaded,
    getMaxPlayersForTeam,
    setCompositions,
  });

  useEffect(() => {
    if (
      loadingEquipes ||
      loadingPlayers ||
      selectedPhase === null ||
      selectedJournee === null
    ) {
      setTeamValidationErrors({});
      return;
    }

    const nextErrors: Record<
      string,
      { reason: string; offendingPlayerIds?: string[] } | undefined
    > = {};

    filteredEquipes.forEach((equipe) => {
      const maxPlayers = getMaxPlayersForTeam(equipe);
      const championshipType: ChampionshipType = equipe.matches.some(
        (match) => match.isFemale === true
      )
        ? "feminin"
        : "masculin";
      const validation = validateTeamCompositionState({
        teamId: equipe.team.id,
        players,
        equipes,
        compositions,
        selectedPhase,
        selectedJournee,
        championshipType,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });

      if (!validation.valid) {
        const errorInfo: { reason: string; offendingPlayerIds?: string[] } = {
          reason: validation.reason || "Composition invalide",
        };
        if (validation.offendingPlayerIds) {
          errorInfo.offendingPlayerIds = validation.offendingPlayerIds;
        }
        nextErrors[equipe.team.id] = errorInfo;
      }

      const availabilityMap =
        (championshipType === "masculin"
          ? availabilities.masculin
          : availabilities.feminin) || {};
      const teamPlayerIds = compositions[equipe.team.id] || [];
      const unavailablePlayers = teamPlayerIds.filter((playerId) => {
        const availability = availabilityMap[playerId];
        return !availability || availability.available !== true;
      });

      if (unavailablePlayers.length > 0) {
        const unavailablePlayerNames = unavailablePlayers
          .map((playerId) => players.find((p) => p.id === playerId))
          .filter((p): p is Player => p !== undefined)
          .map((p) => `${p.firstName} ${p.name}`);

        const reasonText =
          unavailablePlayerNames.length > 0
            ? `Joueur${
                unavailablePlayerNames.length > 1 ? "s" : ""
              } indisponible${
                unavailablePlayerNames.length > 1 ? "s" : ""
              }: ${unavailablePlayerNames.join(", ")}`
            : "Un ou plusieurs joueurs de cette équipe ne sont pas disponibles.";

        const existing = nextErrors[equipe.team.id];
        if (existing) {
          const hasReason = existing.reason.includes(reasonText);
          existing.reason = hasReason
            ? existing.reason
            : `${existing.reason} • ${reasonText}`;
          existing.offendingPlayerIds = Array.from(
            new Set([
              ...(existing.offendingPlayerIds ?? []),
              ...unavailablePlayers,
            ])
          );
        } else {
          nextErrors[equipe.team.id] = {
            reason: reasonText,
            offendingPlayerIds: unavailablePlayers,
          };
        }
      }
    });

    setTeamValidationErrors(nextErrors);
  }, [
    compositions,
    equipes,
    players,
    loadingEquipes,
    loadingPlayers,
    selectedPhase,
    selectedJournee,
    selectedEpreuve,
    availabilities,
    filteredEquipes,
    getMaxPlayersForTeam,
  ]);

  // Filtrer les joueurs disponibles selon la recherche
  const filteredAvailablePlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return availablePlayers;
    }

    const query = searchQuery.toLowerCase().trim();
    return availablePlayers.filter((player) => {
      const fullName = `${player.firstName} ${player.name}`.toLowerCase();
      const licenseId = player.id.toLowerCase();
      return fullName.includes(query) || licenseId.includes(query);
    });
  }, [availablePlayers, searchQuery]);

  const equipesByType = useMemo(
    () => getTeamsByType(filteredEquipes),
    [filteredEquipes]
  );

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

  const hasAssignedPlayers = useMemo(
    () =>
      Object.values(compositions).some(
        (teamPlayers) => Array.isArray(teamPlayers) && teamPlayers.length > 0
      ),
    [compositions]
  );

  const hasDefaultCompositions = useMemo(() => {
    const hasMasculineDefaults = Object.values(
      defaultCompositions.masculin || {}
    ).some((playerIds) => Array.isArray(playerIds) && playerIds.length > 0);
    const hasFeminineDefaults = Object.values(
      defaultCompositions.feminin || {}
    ).some((playerIds) => Array.isArray(playerIds) && playerIds.length > 0);
    return hasMasculineDefaults || hasFeminineDefaults;
  }, [defaultCompositions]);

  const canResetButton = useMemo(
    () =>
      selectedJournee !== null &&
      selectedPhase !== null &&
      hasAssignedPlayers &&
      !isResetting,
    [hasAssignedPlayers, isResetting, selectedJournee, selectedPhase]
  );

  const canCopyDefaultsButton = useMemo(
    () =>
      selectedJournee !== null &&
      selectedPhase !== null &&
      defaultCompositionsLoaded &&
      availabilitiesLoaded &&
      hasDefaultCompositions &&
      !isApplyingDefaults,
    [
      availabilitiesLoaded,
      defaultCompositionsLoaded,
      hasDefaultCompositions,
      isApplyingDefaults,
      selectedJournee,
      selectedPhase,
    ]
  );

  const {
    availablePlayersWithoutAssignment,
    filteredAvailablePlayersWithoutAssignment,
  } = useMemo(() => {
    // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
    const sameTypeEquipes =
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : tabValue === 0
        ? equipesByType.masculin
        : equipesByType.feminin;
    const assignedIds = new Set<string>();
    sameTypeEquipes.forEach((equipe) => {
      const assigned = compositions[equipe.team.id] || [];
      assigned.forEach((playerId) => assignedIds.add(playerId));
    });

    const base = availablePlayers.filter(
      (player) => !assignedIds.has(player.id)
    );
    const filtered = filteredAvailablePlayers.filter(
      (player) => !assignedIds.has(player.id)
    );

    return {
      availablePlayersWithoutAssignment: base,
      filteredAvailablePlayersWithoutAssignment: filtered,
    };
  }, [
    availablePlayers,
    filteredAvailablePlayers,
    tabValue,
    equipesByType,
    compositions,
    selectedEpreuve,
  ]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fonction pour trouver le match correspondant à une équipe pour la journée et phase sélectionnées
  const getMatchForTeam = useCallback(
    (equipe: EquipeWithMatches) => {
      if (selectedJournee === null || selectedPhase === null) {
        return null;
      }
      return (
        getMatchForTeamAndJournee(
          equipe,
          selectedJournee,
          selectedPhase as "aller" | "retour"
        ) || null
      );
    },
    [selectedJournee, selectedPhase]
  );

  // Fonction pour sauvegarder le message personnalisé
  const handleSaveCustomMessage = useCallback(
    async (
      teamId: string,
      customMessage: string,
      journee: number | null,
      phase: string | null
    ) => {
      if (!journee || !phase) return;

      try {
        const result = await persistCustomMessage({
          teamId,
          journee,
          phase,
          customMessage,
        });

        if (result.success) {
          setCustomMessages((prev) => ({ ...prev, [teamId]: customMessage }));
          setDiscordSentStatus((prev) => ({
            ...prev,
            [teamId]: { ...prev[teamId], customMessage },
          }));
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
      member: { id: string; displayName: string; username: string }
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
          handleSaveCustomMessage(
            teamId,
            newMessage,
            selectedJournee,
            selectedPhase
          );
        }

        return { ...prev, [teamId]: newMessage };
      });
      setMentionAnchor(null);
    },
    [selectedJournee, selectedPhase, handleSaveCustomMessage]
  );

  const scheduleCustomMessageSave = useCallback(
    (teamId: string, value: string) => {
      scheduleDebouncedTeamSave({
        timeouts: saveTimeoutRef.current,
        teamId,
        delayMs: 1000,
        onSave: () => {
          if (selectedJournee && selectedPhase) {
            handleSaveCustomMessage(teamId, value, selectedJournee, selectedPhase);
          }
        },
      });
    },
    [handleSaveCustomMessage, selectedJournee, selectedPhase]
  );

  const handleCustomMessageChange = useCallback(
    (
      teamId: string,
      value: string,
      target: HTMLInputElement | HTMLTextAreaElement,
      cursorPos: number
    ) => {
      const mentionState = computeMentionAutocompleteState({
        value,
        cursorPos,
        teamId,
        anchorEl: target,
      });

      setMentionQuery(mentionState.query);
      setMentionAnchor(mentionState.anchor);
      setCustomMessages((prev) => ({
        ...prev,
        [teamId]: value,
      }));
      scheduleCustomMessageSave(teamId, value);
    },
    [scheduleCustomMessageSave]
  );

  const handleCustomMessageKeyDown = useCallback(
    (teamId: string, event: React.KeyboardEvent) => {
      if (!mentionAnchor || mentionAnchor.teamId !== teamId) {
        return;
      }

      if (!isMentionNavigationKey(event.key)) {
        return;
      }

      event.preventDefault();
      if (event.key === "Escape") {
        setMentionAnchor(null);
        return;
      }

      if (event.key === "Enter") {
        const filteredMembers = filterMentionMembers(discordMembers, mentionQuery);
        if (filteredMembers.length > 0) {
          insertMention(teamId, mentionAnchor.startPos, filteredMembers[0]);
        }
      }
    },
    [discordMembers, insertMention, mentionAnchor, mentionQuery]
  );

  const handleCustomMessageBlur = useCallback(
    (teamId: string, event: React.FocusEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      if (relatedTarget && relatedTarget.closest('[role="listbox"]')) {
        return;
      }

      setTimeout(() => {
        setMentionAnchor(null);
        handleSaveCustomMessage(
          teamId,
          customMessages[teamId] || "",
          selectedJournee,
          selectedPhase
        );
      }, 200);
    },
    [customMessages, handleSaveCustomMessage, selectedJournee, selectedPhase]
  );

  const renderTeamRow = (
    equipe: EquipeWithMatches,
    {
      teamAvailabilityMap,
      championshipType,
    }: {
      teamAvailabilityMap: Record<
        string,
        { available?: boolean; fridayAvailable?: boolean; saturdayAvailable?: boolean }
      >;
      championshipType: ChampionshipType;
    }
  ) => {
      return (
        <TeamCompositionRow
          key={equipe.team.id}
          equipe={equipe}
          teamAvailabilityMap={teamAvailabilityMap}
          championshipType={championshipType}
          selectedEpreuve={selectedEpreuve}
          selectedPhase={selectedPhase}
          selectedJournee={selectedJournee}
          players={players}
          compositions={compositions}
          draggedPlayerId={draggedPlayerId}
          dragOverTeamId={dragOverTeamId}
          canDropPlayer={canDropPlayer}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPlayerDragStart={handleDragStart}
          onPlayerDragEnd={handleDragEnd}
          getMaxPlayersForTeam={getMaxPlayersForTeam}
          getMatchForTeam={getMatchForTeam}
          formatMatchInfo={formatMatchInfo}
          getDiscordStatus={getDiscordStatus}
          teamValidationError={teamValidationErrors[equipe.team.id]}
          discordSentStatus={discordSentStatus[equipe.team.id]}
          showMatchInfo={Boolean(showMatchInfo[equipe.team.id])}
          onToggleMatchInfo={(teamId) =>
            setShowMatchInfo((prev) => ({ ...prev, [teamId]: !prev[teamId] }))
          }
          locations={locations}
          discordChannels={discordChannels}
          sendingDiscord={Boolean(sendingDiscord[equipe.team.id])}
          customMessageValue={customMessages[equipe.team.id] || ""}
          mentionAnchor={mentionAnchor}
          mentionQuery={mentionQuery}
          discordMembers={discordMembers}
          onCustomMessageChange={handleCustomMessageChange}
          onCustomMessageKeyDown={handleCustomMessageKeyDown}
          onCustomMessageBlur={handleCustomMessageBlur}
          onSelectMention={insertMention}
          onOpenResendDialog={(teamId, matchInfo, channelId) =>
            setConfirmResendDialog({ open: true, teamId, matchInfo, ...(channelId ? { channelId } : {}) })
          }
          onSendDiscordMessage={handleSendDiscordMessage}
          onRemovePlayer={handleRemovePlayer}
        />
      );
    };

  // Fonction pour formater le message d'informations du match
  const formatMatchInfo = useCallback(
    (
      match: Match | null,
      teamPlayers: Player[],
      teamLocationId?: string,
      teamName?: string,
      isFemale?: boolean,
      epreuve?: EpreuveType | null
    ) =>
      buildDiscordMatchInfo({
        match,
        teamPlayers,
        teamLocationId,
        teamName,
        isFemale,
        isParis: isParisEpreuve(epreuve),
        locations,
        discordMembers,
      }),
    [locations, discordMembers]
  );

  // Fonction pour envoyer le message Discord
  const handleSendDiscordMessage = useCallback(
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
        const result = await sendDiscordMessage({
          teamId,
          content,
          journee,
          phase,
          customMessage,
          channelId,
        });

        if (result.success) {
          setDiscordSentStatus((prev) => {
            const existing = prev[teamId];
            return {
              ...prev,
              [teamId]: buildSentStatusUpdate(existing, customMessage),
            };
          });
        } else {
          alert(`Erreur lors de l'envoi: ${result.error || "Erreur inconnue"}`);
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

  const compositionSummary = useMemo(() => {
    // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
    const currentTypeEquipes =
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : tabValue === 0
        ? equipesByType.masculin
        : equipesByType.feminin;

    let equipesCompletes = 0;
    let equipesIncompletes = 0;
    let equipesInvalides = 0;
    let equipesMatchsJoues = 0;

    currentTypeEquipes.forEach((equipe) => {
      const match = getMatchForTeam(equipe);
      const matchPlayed = isMatchPlayed(match);

      if (matchPlayed) {
        equipesMatchsJoues += 1;
        return;
      }

      const teamPlayers =
        compositions[equipe.team.id]?.map((playerId) =>
          players.find((p) => p.id === playerId)
        ) ?? [];
      const teamPlayersData = teamPlayers.filter(
        (p): p is Player => p !== undefined
      );

      const validationError = teamValidationErrors[equipe.team.id];

      if (validationError) {
        equipesInvalides += 1;
        return;
      }

      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : 4;
      if (teamPlayersData.length >= maxPlayers) {
        equipesCompletes += 1;
      } else {
        equipesIncompletes += 1;
      }
    });

    const totalEditable =
      equipesCompletes + equipesIncompletes + equipesInvalides;
    const percentage =
      totalEditable > 0
        ? Math.round((equipesCompletes / totalEditable) * 100)
        : 0;

    return {
      totalEditable,
      equipesCompletes,
      equipesIncompletes,
      equipesInvalides,
      equipesMatchsJoues,
      percentage,
    };
  }, [
    tabValue,
    equipesByType,
    compositions,
    players,
    getMatchForTeam,
    selectedEpreuve,
    teamValidationErrors,
    getMaxPlayersForTeam,
  ]);

  const currentTypeEquipesForSummary = useMemo(
    () =>
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : tabValue === 0
        ? equipesByType.masculin
        : equipesByType.feminin,
    [equipesByType, selectedEpreuve, tabValue]
  );

  const discordSummary = useMemo(() => {
    const total = currentTypeEquipesForSummary.filter((equipe) => {
      const match = getMatchForTeam(equipe);
      return !isMatchPlayed(match);
    }).length;

    const sent = currentTypeEquipesForSummary.filter((equipe) => {
      const match = getMatchForTeam(equipe);
      return !isMatchPlayed(match) && discordSentStatus[equipe.team.id]?.sent === true;
    }).length;

    return { sent, total };
  }, [currentTypeEquipesForSummary, discordSentStatus, getMatchForTeam]);

  const canShowCompositionsContent =
    Boolean(selectedJournee) &&
    (isParisEpreuve(selectedEpreuve) || Boolean(selectedPhase));

  const masculineTeamsToDisplay = useMemo(
    () =>
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : equipesByType.masculin,
    [equipesByType, selectedEpreuve]
  );

  const renderTeamsTabContent = ({
    teams,
    emptyLabel,
    teamAvailabilityMap,
    championshipType,
  }: {
    teams: EquipeWithMatches[];
    emptyLabel: string;
    teamAvailabilityMap: Record<
      string,
      { available?: boolean; fridayAvailable?: boolean; saturdayAvailable?: boolean }
    >;
    championshipType: ChampionshipType;
  }) => {
    if (teams.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {teams.map((equipe) =>
          renderTeamRow(equipe, {
            teamAvailabilityMap,
            championshipType,
          })
        )}
      </Box>
    );
  };

  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canDropPlayer,
    handleRemovePlayer,
  } = useCompositionAssignments({
    players,
    equipes,
    filteredEquipes,
    compositions,
    selectedPhase,
    selectedJournee,
    tabValue,
    compositionService,
    getMaxPlayersForTeam,
    setCompositions,
    setDefaultCompositions,
  });

  const renderAvailablePlayerItem = useCallback(
    (player: Player) => {
      const phase = selectedPhase || "aller";
      const championshipType = tabValue === 0 ? "masculin" : "feminin";
      const isParis = isParisEpreuve(selectedEpreuve);
      const burnedTeam = isParis
        ? player.highestTeamNumberByPhaseParis?.[phase]
        : championshipType === "masculin"
        ? player.highestMasculineTeamNumberByPhase?.[phase]
        : player.highestFeminineTeamNumberByPhase?.[phase];

      return (
        <AvailablePlayerListItem
          player={player}
          burnedTeam={burnedTeam}
          draggedPlayerId={draggedPlayerId}
          discordStatus={getDiscordStatus(player)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      );
    },
    [
      draggedPlayerId,
      getDiscordStatus,
      handleDragEnd,
      handleDragStart,
      selectedEpreuve,
      selectedPhase,
      tabValue,
    ]
  );

  const runResetCompositions = useCallback(async () => {
    if (
      selectedJournee === null ||
      selectedPhase === null ||
      !hasAssignedPlayers ||
      isResetting
    ) {
      console.log("[Compositions] Reset cancelled", {
        selectedJournee,
        selectedPhase,
        hasAssignedPlayers,
        isResetting,
      });
      return;
    }

    await resetCompositionsBatch({
      selectedJournee,
      selectedPhase,
      compositions,
      equipesByType,
      compositionService,
      setCompositions,
      setIsResetting,
    });
  }, [
    compositions,
    compositionService,
    equipesByType,
    hasAssignedPlayers,
    isResetting,
    selectedJournee,
    selectedPhase,
  ]);

  const runApplyDefaultCompositions = useCallback(async () => {
    if (
      selectedJournee === null ||
      selectedPhase === null ||
      !defaultCompositionsLoaded ||
      !availabilitiesLoaded ||
      !hasDefaultCompositions ||
      isApplyingDefaults
    ) {
      console.log("[Compositions] Apply defaults cancelled", {
        selectedJournee,
        selectedPhase,
        defaultCompositionsLoaded,
        availabilitiesLoaded,
        hasDefaultCompositions,
        isApplyingDefaults,
      });
      return;
    }

    await applyDefaultCompositionsBatch({
      selectedJournee,
      selectedPhase,
      compositions,
      defaultCompositions,
      availabilities,
      equipesByType,
      filteredEquipes,
      players,
      compositionService,
      setCompositions,
      setIsApplyingDefaults,
    });
  }, [
    availabilities,
    availabilitiesLoaded,
    compositionService,
    compositions,
    defaultCompositions,
    defaultCompositionsLoaded,
    equipesByType,
    hasDefaultCompositions,
    isApplyingDefaults,
    players,
    selectedJournee,
    selectedPhase,
    filteredEquipes,
  ]);

  const {
    confirmationDialog,
    handleResetButtonClick,
    handleApplyDefaultsClick,
    handleCancelConfirmation,
    handleConfirmDialog,
  } = useCompositionsConfirmationDialog({
    canResetButton,
    canCopyDefaultsButton,
    hasAssignedPlayers,
    selectedJournee,
    runResetCompositions,
    runApplyDefaultCompositions,
  });

  const closeResendDialog = useCallback(() => {
    setConfirmResendDialog({
      open: false,
      teamId: null,
      matchInfo: null,
    });
  }, []);

  const handleResendDialogConfirm = useCallback(
    (
      teamId: string,
      matchInfo: string,
      journee: number,
      phase: string,
      channelId: string | undefined
    ) => {
      handleSendDiscordMessage(teamId, matchInfo, journee, phase, channelId);
      closeResendDialog();
    },
    [closeResendDialog, handleSendDiscordMessage]
  );

  if (loadingEquipes || loadingPlayers) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <CompositionsView>
      <AuthGuard
        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
        redirectWhenUnauthorized="/joueur"
      >
        <Box sx={{ p: 5 }}>
        <ConfirmationDialog
          open={confirmationDialog.open}
          title={confirmationDialog.title}
          description={confirmationDialog.description}
          cancelLabel={confirmationDialog.cancelLabel ?? "Annuler"}
          confirmLabel={confirmationDialog.confirmLabel ?? "Confirmer"}
          onCancel={handleCancelConfirmation}
          onConfirm={handleConfirmDialog}
        />

        <CompositionsHeader />

        <CompositionsFiltersCard
          selectedEpreuve={selectedEpreuve}
          selectedPhase={selectedPhase}
          selectedJournee={selectedJournee}
          journeeMenuOptions={journeeMenuOptions}
          onEpreuveChange={(epreuve) => {
            setSelectedEpreuve(epreuve);
            setSelectedPhase(null);
            setSelectedJournee(null);
          }}
          onPhaseChange={(phase) => {
            setSelectedPhase(phase);
            setSelectedJournee(null);
          }}
          onJourneeChange={setSelectedJournee}
        />

        <CompositionRulesHelp rules={compositionRules} />

        <CompositionsActionsBar
          canCopyDefaultsButton={canCopyDefaultsButton}
          canResetButton={canResetButton}
          onApplyDefaultsClick={handleApplyDefaultsClick}
          onResetButtonClick={handleResetButtonClick}
        />

        <CompositionsWorkspace
          canShowContent={canShowCompositionsContent}
          showFemalePicker={!isParisEpreuve(selectedEpreuve)}
          tabValue={tabValue}
          onTabChange={handleTabChange}
          availablePlayersPanel={
            <AvailablePlayersSection
              subtitle={availablePlayersSubtitle}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCount={availablePlayersWithoutAssignment.length}
              filteredPlayers={filteredAvailablePlayersWithoutAssignment}
              renderPlayerItem={renderAvailablePlayerItem}
            />
          }
          summaryTabs={
            <CompositionsSummaryTabs
              tabValue={tabValue}
              totalTeams={compositionSummary.totalEditable}
              completedTeams={compositionSummary.equipesCompletes}
              incompleteTeams={compositionSummary.equipesIncompletes}
              invalidTeams={compositionSummary.equipesInvalides}
              matchesPlayed={compositionSummary.equipesMatchsJoues}
              percentage={compositionSummary.percentage}
              discordMessagesSent={discordSummary.sent}
              discordMessagesTotal={discordSummary.total}
              tab0Content={renderTeamsTabContent({
                teams: masculineTeamsToDisplay,
                emptyLabel: isParisEpreuve(selectedEpreuve)
                  ? "Aucune équipe"
                  : "Aucune équipe masculine",
                teamAvailabilityMap: availabilities.masculin || {},
                championshipType: "masculin",
              })}
              tab1Content={renderTeamsTabContent({
                teams: equipesByType.feminin,
                emptyLabel: "Aucune équipe féminine",
                teamAvailabilityMap: isParisEpreuve(selectedEpreuve)
                  ? availabilities.masculin || {}
                  : availabilities.feminin || {},
                championshipType: "feminin",
              })}
            />
          }
        />

        <CompositionsResendDialog
          state={confirmResendDialog}
          teams={equipes.map((equipe) => ({
            id: equipe.team.id,
            name: equipe.team.name,
          }))}
          selectedJournee={selectedJournee}
          selectedPhase={selectedPhase}
          onCancel={closeResendDialog}
          onConfirmSend={handleResendDialogConfirm}
        />

        {(!selectedJournee || !selectedPhase) && <SelectionPromptCard />}
        </Box>
      </AuthGuard>
    </CompositionsView>
  );
}
