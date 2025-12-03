"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useMemo, useEffect, useCallback } from "react";                                                     
import Link from "next/link";
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Chip,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  FormControlLabel,
  Switch,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import { DragIndicator, AlternateEmail, Warning } from "@mui/icons-material";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useTeamData, type EquipeWithMatches } from "@/hooks/useTeamData";
import { usePlayers } from "@/hooks/usePlayers";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { EpreuveType, getMatchEpreuve } from "@/lib/shared/epreuve-utils";
import { ChampionshipType } from "@/types";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  canAssignPlayerToTeam,
  validateTeamCompositionState,
  AssignmentValidationResult,
  getParisTeamStructure,
  isParisChampionship,
} from "@/lib/compositions/validators";
import {
  getPlayersByType,
  getTeamsByType,
} from "@/lib/compositions/championship-utils";
import type { Player } from "@/types/team-management";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { CompositionRulesHelp, type CompositionRuleItem } from "@/components/compositions/CompositionRulesHelp";
import { usePlayerDrag } from "@/hooks/usePlayerDrag";
import { EpreuveSelect } from "@/components/compositions/Filters/EpreuveSelect";
import { PhaseSelect } from "@/components/compositions/Filters/PhaseSelect";
import { TeamPicker } from "@/components/compositions/Filters/TeamPicker";
import { TabPanel } from "@/components/compositions/Filters/TabPanel";
import { DefaultCompositionsView } from "@/components/compositions/views/DefaultCompositionsView";

interface PhaseSelectOption {
  value: "aller" | "retour";
  label: string;
}

const MAX_PLAYERS_PER_DEFAULT_TEAM = 5;
const MIN_PLAYERS_FOR_DEFAULT_COMPLETION = 4;

export function DefaultCompositionsContainer() {
  const { equipes, loading: loadingEquipes, currentPhase } = useTeamData();
  const { players, loading: loadingPlayers } = usePlayers();
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType>("championnat_equipes");
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [defaultCompositions, setDefaultCompositions] = useState<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>({
    masculin: {},
    feminin: {},
  });
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] =
    useState(false);
  const [defaultCompositionErrors, setDefaultCompositionErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [defaultCompositionTab, setDefaultCompositionTab] = useState<
    ChampionshipType
  >("masculin");
  const [defaultCompositionMessage, setDefaultCompositionMessage] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [includeAllPlayers, setIncludeAllPlayers] = useState(false);
  const { members: discordMembers } = useDiscordMembers();
  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );

  useEffect(() => {
    // Pour le championnat de Paris, définir automatiquement la phase à "aller"
    if (selectedEpreuve === "championnat_paris") {
      if (selectedPhase !== "aller") {
        setSelectedPhase("aller");
      }
    } else if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase, selectedEpreuve]);

  // Fonction helper pour vérifier le statut Discord d'un joueur
  const getDiscordStatus = useCallback((player: Player): "none" | "invalid" | "valid" => {
    if (!player.discordMentions || player.discordMentions.length === 0) {
      return "none";
    }
    const validMemberIds = new Set(discordMembers.map(m => m.id));
    const hasInvalidMention = player.discordMentions.some(mentionId => !validMemberIds.has(mentionId));
    return hasInvalidMention ? "invalid" : "valid";
  }, [discordMembers]);

  useEffect(() => {
    if (!selectedPhase) {
      setDefaultCompositions({ masculin: {}, feminin: {} });
      setDefaultCompositionsLoaded(false);
      console.log("[DefaultCompositions] Phase non sélectionnée, réinitialisation des compositions");
      return;
    }

    setDefaultCompositionsLoaded(false);

    const loadDefaults = async () => {
      try {
        console.log(
          "[DefaultCompositions] Chargement des compositions par défaut",
          { phase: selectedPhase }
        );
        const [masculineDefaults, feminineDefaults] = await Promise.all([
          compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
        ]);

        setDefaultCompositions({
          masculin: masculineDefaults?.teams || {},
          feminin: feminineDefaults?.teams || {},
        });
        setDefaultCompositionMessage(null);
        console.log("[DefaultCompositions] Compositions chargées", {
          phase: selectedPhase,
          masculinTeams: Object.keys(masculineDefaults?.teams ?? {}),
          femininTeams: Object.keys(feminineDefaults?.teams ?? {}),
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions({ masculin: {}, feminin: {} });
        console.log("[DefaultCompositions] Échec du chargement des compositions, réinitialisation", {
          phase: selectedPhase,
        });
      } finally {
        setDefaultCompositionsLoaded(true);
        console.log("[DefaultCompositions] Chargement terminé", {
          phase: selectedPhase,
        });
      }
    };

    loadDefaults();
  }, [selectedPhase, compositionDefaultsService]);

  // Filtrer les équipes selon l'épreuve sélectionnée
  const filteredEquipes = useMemo(() => {
    if (!selectedEpreuve) {
      return equipes;
    }
    return equipes.filter((equipe) => {
      const epreuve = getMatchEpreuve(
        equipe.matches[0] || {},
        equipe.team
      );
      return epreuve === selectedEpreuve;
    });
  }, [equipes, selectedEpreuve]);

  const equipesByType = useMemo(
    () => getTeamsByType(filteredEquipes),
    [filteredEquipes]
  );

  const mergedDefaultCompositions = useMemo(
    () => ({
      ...defaultCompositions.masculin,
      ...defaultCompositions.feminin,
    }),
    [defaultCompositions]
  );

  const championshipPlayers = useMemo(
    () =>
      players.filter(
        (player) => 
          player.participation?.championnat === true && 
          (player.isActive || player.isTemporary)
      ),
    [players]
  );

  const playerPool = useMemo(
    () => (includeAllPlayers ? players : championshipPlayers),
    [players, championshipPlayers, includeAllPlayers]
  );

  // Filtrer les joueurs selon le type de championnat
  // Masculin : hommes ET femmes
  // Féminin : uniquement les femmes
  const availablePlayers = useMemo(
    () => getPlayersByType(playerPool, defaultCompositionTab),
    [defaultCompositionTab, playerPool]
  );

  const filteredAvailablePlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return availablePlayers;
    }
    const normalized = searchQuery.trim().toLowerCase();
    return availablePlayers.filter((player) => {
      const fullName = `${player.firstName} ${player.name}`.toLowerCase();
      const license = player.license?.toLowerCase() ?? "";
      return (
        fullName.includes(normalized) ||
        license.includes(normalized)
      );
    });
  }, [availablePlayers, searchQuery]);

  const {
    availablePlayersWithoutAssignment,
    filteredAvailablePlayersWithoutAssignment,
  } = useMemo(() => {
    const currentTeams =
      // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
      selectedEpreuve === "championnat_paris"
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : defaultCompositionTab === "masculin"
          ? equipesByType.masculin
          : equipesByType.feminin;
    const championshipTypeForAssignments =
      selectedEpreuve === "championnat_paris"
        ? "masculin"
        : defaultCompositionTab;
    const assignments = defaultCompositions[championshipTypeForAssignments];

    const assignedIds = new Set<string>();
    currentTeams.forEach((equipe) => {
      (assignments[equipe.team.id] || []).forEach((id) =>
        assignedIds.add(id)
      );
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
    defaultCompositionTab,
    selectedEpreuve,
    defaultCompositions,
    equipesByType,
  ]);

  // Fonction helper pour calculer le maxPlayers selon l'épreuve et la division
  const getMaxPlayersForTeam = useCallback(
    (equipe: EquipeWithMatches): number => {
      // Vérifier directement si l'équipe fait partie du championnat de Paris
      if (isParisChampionship(equipe)) {
        const structure = getParisTeamStructure(equipe.team.division || "");
        return structure?.totalPlayers || MAX_PLAYERS_PER_DEFAULT_TEAM; // Fallback si structure non reconnue
      }
      return MAX_PLAYERS_PER_DEFAULT_TEAM; // Championnat par équipes : 5 joueurs par défaut
    },
    []
  );

  const canDropPlayer = useCallback(
    (playerId: string, teamId: string): AssignmentValidationResult => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : MAX_PLAYERS_PER_DEFAULT_TEAM;
      const championshipType: ChampionshipType = equipe &&
        equipe.matches.some((match) => match.isFemale)
          ? "feminin"
          : "masculin";

      return canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
        championshipType,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });
    },
    [
      players,
      equipes,
      mergedDefaultCompositions,
      selectedPhase,
      getMaxPlayersForTeam,
    ]
  );

  useEffect(() => {
    if (!defaultCompositionsLoaded || selectedPhase === null) {
      setDefaultCompositionErrors({});
      return;
    }

    const nextErrors: Record<string, string | undefined> = {};

    Object.keys(mergedDefaultCompositions).forEach((teamId) => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : MAX_PLAYERS_PER_DEFAULT_TEAM;
      const championshipType: ChampionshipType = equipe &&
        equipe.matches.some((match) => match.isFemale)
          ? "feminin"
          : "masculin";

      const validation = validateTeamCompositionState({
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
        championshipType,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: maxPlayers,
      });

      if (!validation.valid) {
        nextErrors[teamId] = validation.reason;
      }
    });

    setDefaultCompositionErrors(nextErrors);
  }, [
    mergedDefaultCompositions,
    players,
    equipes,
    selectedPhase,
    defaultCompositionsLoaded,
    getMaxPlayersForTeam,
  ]);

  const assignPlayerToTeam = useCallback(
    async (teamId: string, playerId: string): Promise<boolean> => {
      console.log("[DefaultCompositions] assignPlayerToTeam called", {
        teamId,
        playerId,
        phase: selectedPhase,
      });

      if (selectedPhase === null) {
        setDefaultCompositionMessage(
          "Veuillez sélectionner une phase pour gérer les compositions."
        );
        console.log(
          "[DefaultCompositions] assignPlayerToTeam aborted: no phase selected"
        );
        return false;
      }

      const equipe = equipes.find((eq) => eq.team.id === teamId);
      const player = players.find((p) => p.id === playerId);

      if (!equipe || !player) {
        setDefaultCompositionMessage("Équipe ou joueur introuvable.");
        console.log(
          "[DefaultCompositions] assignPlayerToTeam aborted: missing data",
          {
            hasEquipe: Boolean(equipe),
            hasPlayer: Boolean(player),
          }
        );
        return false;
      }

      const validation = canDropPlayer(playerId, teamId);

      if (!validation.canAssign) {
        setDefaultCompositionMessage(
          validation.reason || "Composition invalide."
        );
        console.log(
          "[DefaultCompositions] assignPlayerToTeam validation blocked",
          {
            teamId,
            playerId,
            reason: validation.reason,
          }
        );
        return false;
      }

      // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
      const championshipType =
        selectedEpreuve === "championnat_paris"
          ? "masculin"
          : equipe.matches.some((match) => match.isFemale === true)
            ? "feminin"
            : "masculin";

      const sameTypeTeams = (
        championshipType === "feminin"
          ? equipesByType.feminin
          : equipesByType.masculin
      ).map((eq) => eq.team.id);

      const previousAssignments = defaultCompositions[championshipType] || {};
      const updatedForType: Record<string, string[]> = Object.fromEntries(
        Object.entries(previousAssignments).map(([key, value]) => [key, [...value]])
      );

      let removedFromOtherTeams = false;
      sameTypeTeams.forEach((sameTeamId) => {
        const playersForTeam = updatedForType[sameTeamId];
        if (playersForTeam?.includes(playerId)) {
          updatedForType[sameTeamId] = playersForTeam.filter(
            (id) => id !== playerId
          );
          if (sameTeamId !== teamId) {
            removedFromOtherTeams = true;
          }
        }
      });

      const currentTeamPlayers = [...(updatedForType[teamId] ?? [])];

      if (currentTeamPlayers.includes(playerId)) {
        console.log("[DefaultCompositions] Player already present in team", {
          teamId,
          playerId,
          removedFromOtherTeams,
        });

        if (removedFromOtherTeams) {
          const nextState = {
            ...defaultCompositions,
            [championshipType]: updatedForType,
          };
          setDefaultCompositions(nextState);
          try {
            console.log(
              "[DefaultCompositions] Persisting removal from other teams",
              {
                teamId,
                playerId,
                championshipType,
                phase: selectedPhase,
              }
            );
            await compositionDefaultsService.saveDefaults({
              phase: selectedPhase,
              championshipType,
              teams: updatedForType,
            });
            console.log(
              "[DefaultCompositions] Removal persisted successfully",
              {
                teamId,
                playerId,
                championshipType,
                phase: selectedPhase,
              }
            );
            setDefaultCompositionMessage(null);
            return true;
          } catch (error) {
            console.error(
              "Erreur lors de la sauvegarde de la composition par défaut:",
              error
            );
            console.log(
              "[DefaultCompositions] Persisting removal failed",
              {
                teamId,
                playerId,
                championshipType,
                phase: selectedPhase,
                error,
              }
            );
            setDefaultCompositionMessage(
              "Erreur lors de la sauvegarde de la composition par défaut."
            );
            return false;
          }
        }

        setDefaultCompositionMessage(null);
        return true;
      }

      // equipe est déjà déclaré plus haut dans la fonction
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : MAX_PLAYERS_PER_DEFAULT_TEAM;
      
      if (currentTeamPlayers.length >= maxPlayers) {
        setDefaultCompositionMessage(
          `Cette équipe est déjà complète (${maxPlayers} joueurs).`
        );
        console.log("[DefaultCompositions] Ajout refusé : équipe pleine", {
          teamId,
          playerId,
          currentPlayerCount: currentTeamPlayers.length,
          maxPlayers,
        });
        return false;
      }

      const nextPlayers = [...currentTeamPlayers, playerId];
      updatedForType[teamId] = nextPlayers;

      const nextState = {
        ...defaultCompositions,
        [championshipType]: updatedForType,
      };

      setDefaultCompositions(nextState);
      console.log("[DefaultCompositions] Player added and state updated", {
        teamId,
        playerId,
        previousPlayers: currentTeamPlayers,
        nextPlayers,
      });

      try {
      console.log("[DefaultCompositions] Sauvegarde d'une composition par défaut", {
        teamId,
        playerId,
        championshipType,
        phase: selectedPhase,
          teams: updatedForType,
      });
        await compositionDefaultsService.saveDefaults({
          phase: selectedPhase,
          championshipType,
          teams: updatedForType,
        });
      console.log("[DefaultCompositions] Sauvegarde réussie", {
        teamId,
        playerId,
        championshipType,
        phase: selectedPhase,
      });
        setDefaultCompositionMessage(null);
        return true;
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde de la composition par défaut:",
          error
        );
      console.log("[DefaultCompositions] Sauvegarde échouée", {
        teamId,
        playerId,
        championshipType,
        phase: selectedPhase,
        error,
      });
        setDefaultCompositionMessage(
          "Erreur lors de la sauvegarde de la composition par défaut."
        );
        return false;
      }
    },
    [
      selectedPhase,
      equipes,
      players,
      canDropPlayer,
      defaultCompositions,
      compositionDefaultsService,
      equipesByType,
      getMaxPlayersForTeam,
      selectedEpreuve,
    ]
  );

  const handleRemoveDefaultPlayer = useCallback(
    async (teamId: string, playerId: string) => {
      if (selectedPhase === null) {
        return;
      }

      const equipe = equipes.find((eq) => eq.team.id === teamId);
      if (!equipe) {
        return;
      }

      // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
      const championshipType =
        selectedEpreuve === "championnat_paris"
          ? "masculin"
          : equipe.matches.some((match) => match.isFemale === true)
            ? "feminin"
            : "masculin";

      let nextTeamsForType: Record<string, string[]> | null = null;

      setDefaultCompositions((prev) => {
        const updatedForType = { ...prev[championshipType] };
        const currentPlayers = updatedForType[teamId] || [];

        if (!currentPlayers.includes(playerId)) {
          nextTeamsForType = updatedForType;
          return prev;
        }

        updatedForType[teamId] = currentPlayers.filter((id) => id !== playerId);
    console.log("[DefaultCompositions] Suppression d'un joueur de la composition", {
      teamId,
      playerId,
      championshipType,
      phase: selectedPhase,
      remainingPlayers: updatedForType[teamId],
    });
        nextTeamsForType = updatedForType;

        return {
          ...prev,
          [championshipType]: updatedForType,
        };
      });

      if (!nextTeamsForType) {
        return;
      }

      try {
    console.log("[DefaultCompositions] Sauvegarde après suppression d'un joueur", {
      teamId,
      playerId,
      championshipType,
      phase: selectedPhase,
      teams: nextTeamsForType,
    });
        await compositionDefaultsService.saveDefaults({
          phase: selectedPhase,
          championshipType,
          teams: nextTeamsForType,
        });
    console.log("[DefaultCompositions] Sauvegarde réussie après suppression", {
      teamId,
      playerId,
      championshipType,
      phase: selectedPhase,
    });
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde de la composition par défaut:",
          error
        );
    console.log("[DefaultCompositions] Échec de la sauvegarde après suppression", {
      teamId,
      playerId,
      championshipType,
      phase: selectedPhase,
      error,
    });
        setDefaultCompositionMessage(
          "Erreur lors de la sauvegarde de la composition par défaut."
        );
      }
    },
    [selectedPhase, equipes, compositionDefaultsService, selectedEpreuve]
  );

  const getDragPreviewOptions = useCallback(
    (playerId: string) => {
      let championshipType: ChampionshipType = defaultCompositionTab;
      const assignmentsByType = defaultCompositions;

      (["masculin", "feminin"] as const).forEach((type) => {
        const assignment = assignmentsByType[type];
        if (Object.values(assignment).some((ids) => ids?.includes(playerId))) {
          championshipType = type;
        }
      });

      return {
        championshipType,
        phase: (selectedPhase || "aller") as "aller" | "retour",
      };
    },
    [defaultCompositionTab, defaultCompositions, selectedPhase]
  );

  const handleInvalidDrop = useCallback(
    (validation: AssignmentValidationResult) => {
      setDefaultCompositionMessage(validation.reason || "Composition invalide.");
    },
    []
  );

  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = usePlayerDrag({
    players,
    canDropPlayer,
    getPreviewOptions: getDragPreviewOptions,
    onDrop: async (teamId, playerId) => {
      await assignPlayerToTeam(teamId, playerId);
    },
    onInvalidDrop: handleInvalidDrop,
  });

  const compositionSummary = useMemo(() => {
    const currentTeams =
      // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
      selectedEpreuve === "championnat_paris"
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : defaultCompositionTab === "masculin"
          ? equipesByType.masculin
          : equipesByType.feminin;
    const championshipTypeForAssignments =
      selectedEpreuve === "championnat_paris"
        ? "masculin"
        : defaultCompositionTab;
    const assignments = defaultCompositions[championshipTypeForAssignments];

    let completed = 0;
    let incomplete = 0;
    let invalid = 0;

    currentTeams.forEach((equipe) => {
      const count = assignments[equipe.team.id]?.length ?? 0;
      if (defaultCompositionErrors[equipe.team.id]) {
        invalid += 1;
      }
      if (count >= MIN_PLAYERS_FOR_DEFAULT_COMPLETION) {
        completed += 1;
      } else {
        incomplete += 1;
      }
    });

    const total = completed + incomplete;
    const percentage =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTeams: total,
      completedTeams: completed,
      incompleteTeams: incomplete,
      invalidTeams: invalid,
      percentage,
    };
  }, [
    defaultCompositionTab,
    defaultCompositions,
    defaultCompositionErrors,
    equipesByType,
    selectedEpreuve,
  ]);

  const availablePlayersSubtitle = useMemo(() => {
    const base =
      defaultCompositionTab === "masculin" ? "Masculin" : "Féminin";
    return selectedPhase ? `${base} · Phase ${selectedPhase}` : base;
  }, [defaultCompositionTab, selectedPhase]);

  const currentTabIndex = defaultCompositionTab === "masculin" ? 0 : 1;

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setDefaultCompositionTab(newValue === 0 ? "masculin" : "feminin");
    },
    []
  );

  const rulesForDefaults: CompositionRuleItem[] = useMemo(
    () => {
      if (selectedEpreuve === "championnat_paris") {
        // Règles spécifiques au championnat de Paris
        return [
          {
            id: "paris-structure",
            label: "Structure par groupes : 3 groupes de 3 joueurs (Excellence, Promo Excellence, Honneur), 2 groupes de 3 (Division 1), 1 groupe de 3 (Division 2)",
            scope: "both",
          },
          {
            id: "paris-article8",
            label: "Article 8 : Les joueurs du groupe 2 doivent avoir des points entre le max du groupe 1 et le min du groupe 3. Permutation possible dans un même groupe.",
            scope: "both",
          },
          {
            id: "paris-article12",
            label: "Article 12 : Maximum 1 joueur brûlé par groupe de 3. Si 2 joueurs brûlés dans un même groupe, les 2 sont non qualifiés.",
            scope: "both",
          },
          {
            id: "paris-burning",
            label: "Brûlage : Un joueur est brûlé s'il a joué 3 matchs ou plus dans UNE équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
            scope: "both",
          },
          {
            id: "paris-mixte",
            label: "Championnat mixte : pas de distinction masculin/féminin, une seule phase",
            scope: "both",
          },
        ];
      }
      
      // Règles pour le championnat par équipes
      return [
        {
          id: "maxPlayersDefaults",
          label: "Une composition par défaut peut contenir jusqu'à 5 joueurs",
          scope: "defaults",
        },
        {
          id: "maxPlayersDaily",
          label: "Une composition de journée ne peut aligner que 4 joueurs",
          scope: "daily",
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
          label: "Brûlage : Un joueur est brûlé s'il a joué 2 matchs ou plus dans une équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
          scope: "both",
        },
        {
          id: "fftt",
          label: "Points minimum selon division : Messieurs N1 (≥1800), N2 (≥1600), N3 (≥1400) | Dames N1 (≥1100), N2 (≥900 pour 2 sur 4)",
          scope: "both",
        },
        {
          id: "defaults-specific",
          label: "Aucune limitation de journée (J2) sur cette page",
          scope: "defaults",
          description:
            "Les règles spécifiques à la J2 ne sont appliquées que lors de la préparation d'une composition de journée.",
        },
      ];
    },
    [selectedEpreuve]
  );

  const phaseOptions: PhaseSelectOption[] = [
    { value: "aller", label: "Phase aller" },
    { value: "retour", label: "Phase retour" },
  ];

  return (
    <DefaultCompositionsView>
      <AuthGuard
        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
        redirectWhenUnauthorized="/joueur"
      >
        <Box sx={{ p: 5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            gap={2}
            mb={4}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                Compositions par défaut
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Définissez la composition de référence de chaque équipe pour une
                phase. Ces compositions serviront de base lors de la préparation
                des journées.
              </Typography>
            </Box>
            <Button component={Link} href="/compositions" variant="outlined">
              Retour aux compositions de journée
            </Button>
          </Stack>

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <EpreuveSelect
                  value={selectedEpreuve}
                  onChange={(epreuve) => {
                    setSelectedEpreuve(epreuve);
                    setSelectedPhase(null);
                  }}
                />
                {selectedEpreuve !== "championnat_paris" && (
                  <PhaseSelect
                    value={selectedPhase}
                    onChange={(phase) => setSelectedPhase(phase)}
                    options={phaseOptions}
                    minWidth={180}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          <CompositionRulesHelp rules={rulesForDefaults} />

          {loadingEquipes || loadingPlayers ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : !selectedPhase ? (
            <Alert severity="info">
              Sélectionnez une phase pour gérer les compositions par défaut.
            </Alert>
          ) : !defaultCompositionsLoaded ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {defaultCompositionMessage && (
                <Alert
                  severity="warning"
                  onClose={() => setDefaultCompositionMessage(null)}
                  sx={{ mb: 2 }}
                >
                  {defaultCompositionMessage}
                </Alert>
              )}

              <TeamPicker
                value={currentTabIndex}
                onChange={handleTabChange}
                showFemale={selectedEpreuve !== "championnat_paris"}
              />

              <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
                <AvailablePlayersPanel
                  title="Joueurs"
                  subtitle={availablePlayersSubtitle}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalCount={availablePlayersWithoutAssignment.length}
                  filteredPlayers={filteredAvailablePlayersWithoutAssignment}
                  emptyMessage="Aucun joueur disponible"
                  noResultMessage={(query) => `Aucun joueur trouvé pour “${query}”`}
                  renderPlayerItem={(player) => {
                    const phase = (selectedPhase || "aller") as "aller" | "retour";
                    const championshipType = defaultCompositionTab;
                    // Pour les compositions par défaut, on ne peut pas déterminer directement le championnat
                    // On utilise les propriétés par défaut (championnat par équipes)
                    // Note: Si besoin, on pourrait passer l'équipe en paramètre pour utiliser isParisChampionship
                    const burnedTeam =
                      championshipType === "masculin"
                        ? player.highestMasculineTeamNumberByPhase?.[phase]
                        : player.highestFeminineTeamNumberByPhase?.[phase];
                    const isForeign = player.nationality === "ETR";
                    const isEuropean = player.nationality === "C";

                    return (
                      <ListItem
                        disablePadding
                        sx={{ mb: 1 }}
                        secondaryAction={null}
                      >
                        <ListItemButton
                          draggable
                          onDragStart={(event) => handleDragStart(event, player.id)}
                          onDragEnd={handleDragEnd}
                          sx={{
                            cursor: "grab",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            backgroundColor: "background.paper",
                            "&:hover": {
                              backgroundColor: "action.hover",
                              borderColor: "primary.main",
                              boxShadow: 1,
                              cursor: "grab",
                            },
                            "&:active": {
                              cursor: "grabbing",
                              opacity: 0.6,
                            },
                          }}
                        >
                          <IconButton
                            edge="start"
                            size="small"
                            sx={{
                              mr: 1,
                              color: "text.secondary",
                              cursor:
                                draggedPlayerId === player.id ? "grabbing" : "grab",
                              "&:hover": {
                                cursor: "grab",
                              },
                              "&:active": {
                                cursor: "grabbing",
                              },
                            }}
                            disabled
                          >
                            <DragIndicator fontSize="small" />
                          </IconButton>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Typography variant="body2" component="span">
                                  {player.firstName} {player.name}
                                </Typography>
                                {isEuropean && (
                                  <Chip
                                    label="EUR"
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                                {isForeign && (
                                  <Chip
                                    label="ETR"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                                {burnedTeam !== undefined && burnedTeam !== null && (
                                  <Chip
                                    label={`Brûlé Éq. ${burnedTeam}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                                {!player.participation?.championnat && (
                                  <Chip
                                    label="Hors championnat"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                                {!player.isActive && !player.isTemporary && (
                                  <Chip
                                    label="Sans licence"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                                {player.isTemporary && (
                                  <Chip
                                    label="Temporaire"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {player.points !== undefined && player.points !== null
                                  ? `${player.points} points`
                                  : "Points non disponibles"}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  }}
                  actions={
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeAllPlayers}
                          onChange={(event) =>
                            setIncludeAllPlayers(event.target.checked)
                          }
                          size="small"
                        />
                      }
                      label="Afficher tous les joueurs (hors championnat et sans licence)"
                    />
                  }
                />

                <Box sx={{ flex: 1 }}>
                  <CompositionsSummary
                    totalTeams={compositionSummary.totalTeams}
                    completedTeams={compositionSummary.completedTeams}
                    incompleteTeams={compositionSummary.incompleteTeams}
                  invalidTeams={compositionSummary.invalidTeams}
                    matchesPlayed={0}
                    showMatchesPlayed={false}
                    percentage={compositionSummary.percentage}
                    title="Bilan des compositions par défaut"
                  />

                  <TabPanel
                    value={currentTabIndex}
                    index={0}
                    baseId="default-compositions"
                  >
                    {(() => {
                      // Pour le championnat de Paris, afficher toutes les équipes (masculin + féminin)
                      const equipesToDisplay =
                        selectedEpreuve === "championnat_paris"
                          ? [...equipesByType.masculin, ...equipesByType.feminin]
                          : equipesByType.masculin;

                      if (equipesToDisplay.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            {selectedEpreuve === "championnat_paris"
                              ? "Aucune équipe"
                              : "Aucune équipe masculine"}
                          </Typography>
                        );
                      }

                      return (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {equipesToDisplay.map((equipe) => {
                          // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
                          const championshipTypeForTeam =
                            selectedEpreuve === "championnat_paris"
                              ? "masculin"
                              : equipe.matches.some((match) => match.isFemale === true)
                                ? "feminin"
                                : "masculin";
                          const assignments =
                            defaultCompositions[championshipTypeForTeam][equipe.team.id] || [];
                          const teamPlayers = assignments
                            .map((playerId) => players.find((p) => p.id === playerId))
                            .filter((p): p is Player => p !== undefined);

                          const isDragOver =
                            draggedPlayerId && dragOverTeamId === equipe.team.id;
                          const dropCheck =
                            draggedPlayerId && dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : {
                                  canAssign: true,
                                  reason: undefined,
                                  simulatedPlayers: teamPlayers,
                                };
                          const canDrop = dropCheck.canAssign;
                          const validationError =
                            defaultCompositionErrors[equipe.team.id];

                          return (
                            <Box key={equipe.team.id}>
                              <TeamCompositionCard
                                equipe={equipe}
                                players={teamPlayers}
                                onRemovePlayer={(playerId) =>
                                  handleRemoveDefaultPlayer(
                                    equipe.team.id,
                                    playerId
                                  )
                                }
                                onPlayerDragStart={(event, playerId) =>
                                  handleDragStart(event, playerId)
                                }
                                onPlayerDragEnd={handleDragEnd}
                                onDragOver={(event) =>
                                  handleDragOver(event, equipe.team.id)
                                }
                                onDragLeave={handleDragLeave}
                                onDrop={(event) =>
                                  handleDrop(event, equipe.team.id)
                                }
                                isDragOver={Boolean(isDragOver)}
                                canDrop={canDrop}
                                dropReason={dropCheck.reason}
                                draggedPlayerId={draggedPlayerId}
                                dragOverTeamId={dragOverTeamId}
                                matchPlayed={false}
                                showMatchStatus={false}
                                selectedEpreuve={null}
                                additionalHeader={
                                  validationError ? (
                                    <Chip
                                      label="Invalide"
                                      size="small"
                                      color="error"
                                      variant="filled"
                                    />
                                  ) : undefined
                                }
                                maxPlayers={getMaxPlayersForTeam(equipe)}
                            completionThreshold={
                              MIN_PLAYERS_FOR_DEFAULT_COMPLETION
                            }
                                renderPlayerIndicators={(player) => {
                                  const phase = (selectedPhase ||
                                    "aller") as "aller" | "retour";
                                  // Utiliser les bonnes propriétés selon le championnat
                                  const isParis = isParisChampionship(equipe);
                                  const burnedTeam = isParis
                                    ? player.highestTeamNumberByPhaseParis?.[phase]
                                    : player.highestMasculineTeamNumberByPhase?.[
                                        phase
                                      ];
                                  return (
                                    <>
                                      {player.nationality === "C" && (
                                        <Chip
                                          label="EUR"
                                          size="small"
                                          color="info"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {player.nationality === "ETR" && (
                                        <Chip
                                          label="ETR"
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {burnedTeam !== undefined &&
                                        burnedTeam !== null && (
                                          <Chip
                                            label={`Brûlé Éq. ${burnedTeam}`}
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                            }}
                                          />
                                        )}
                                      {player.isTemporary && (
                                        <Chip
                                          label="Temporaire"
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {(() => {
                                        const discordStatus = getDiscordStatus(player);
                                        if (discordStatus === "none") {
                                          return (
                                            <Tooltip title="Aucun login Discord configuré">
                                              <Chip
                                                icon={<AlternateEmail fontSize="small" />}
                                                label="Pas Discord"
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                                sx={{
                                                  height: 18,
                                                  fontSize: "0.65rem",
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        }
                                        if (discordStatus === "invalid") {
                                          return (
                                            <Tooltip title="Au moins un login Discord n'existe plus sur le serveur">
                                              <Chip
                                                icon={<Warning fontSize="small" />}
                                                label="Discord invalide"
                                                size="small"
                                                color="warning"
                                                variant="outlined"
                                                sx={{
                                                  height: 18,
                                                  fontSize: "0.65rem",
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  );
                                }}
                                renderPlayerSecondary={(player) =>
                                  player.points !== undefined &&
                                  player.points !== null
                                    ? `${player.points} points`
                                    : "Points non disponibles"
                                }
                              />
                              {validationError && (
                                <Typography
                                  variant="caption"
                                  color="error"
                                  sx={{ mt: 1, display: "block" }}
                                >
                                  {validationError}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                      );
                    })()}
                  </TabPanel>

                  <TabPanel
                    value={currentTabIndex}
                    index={1}
                    baseId="default-compositions"
                  >
                    {equipesByType.feminin.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucune équipe féminine
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {equipesByType.feminin.map((equipe) => {
                          const assignments =
                            defaultCompositions.feminin[equipe.team.id] || [];
                          const teamPlayers = assignments
                            .map((playerId) => players.find((p) => p.id === playerId))
                            .filter((p): p is Player => p !== undefined);

                          const isDragOver =
                            draggedPlayerId && dragOverTeamId === equipe.team.id;
                          const dropCheck =
                            draggedPlayerId && dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : {
                                  canAssign: true,
                                  reason: undefined,
                                  simulatedPlayers: teamPlayers,
                                };
                          const canDrop = dropCheck.canAssign;
                          const validationError =
                            defaultCompositionErrors[equipe.team.id];

                          return (
                            <Box key={equipe.team.id}>
                              <TeamCompositionCard
                                equipe={equipe}
                                players={teamPlayers}
                                onRemovePlayer={(playerId) =>
                                  handleRemoveDefaultPlayer(
                                    equipe.team.id,
                                    playerId
                                  )
                                }
                                onPlayerDragStart={(event, playerId) =>
                                  handleDragStart(event, playerId)
                                }
                                onPlayerDragEnd={handleDragEnd}
                                onDragOver={(event) =>
                                  handleDragOver(event, equipe.team.id)
                                }
                                onDragLeave={handleDragLeave}
                                onDrop={(event) =>
                                  handleDrop(event, equipe.team.id)
                                }
                                isDragOver={Boolean(isDragOver)}
                                canDrop={canDrop}
                                dropReason={dropCheck.reason}
                                draggedPlayerId={draggedPlayerId}
                                dragOverTeamId={dragOverTeamId}
                                matchPlayed={false}
                                showMatchStatus={false}
                                selectedEpreuve={null}
                                additionalHeader={
                                  validationError ? (
                                    <Chip
                                      label="Invalide"
                                      size="small"
                                      color="error"
                                      variant="filled"
                                    />
                                  ) : undefined
                                }
                                maxPlayers={getMaxPlayersForTeam(equipe)}
                            completionThreshold={
                              MIN_PLAYERS_FOR_DEFAULT_COMPLETION
                            }
                                renderPlayerIndicators={(player) => {
                                  const phase = (selectedPhase ||
                                    "aller") as "aller" | "retour";
                                  // Utiliser les bonnes propriétés selon le championnat
                                  const isParis = isParisChampionship(equipe);
                                  const burnedTeam = isParis
                                    ? player.highestTeamNumberByPhaseParis?.[phase]
                                    : player.highestFeminineTeamNumberByPhase?.[
                                        phase
                                      ];
                                  return (
                                    <>
                                      {player.nationality === "C" && (
                                        <Chip
                                          label="EUR"
                                          size="small"
                                          color="info"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {player.nationality === "ETR" && (
                                        <Chip
                                          label="ETR"
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {burnedTeam !== undefined &&
                                        burnedTeam !== null && (
                                          <Chip
                                            label={`Brûlé Éq. ${burnedTeam}`}
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                            }}
                                          />
                                        )}
                                      {player.isTemporary && (
                                        <Chip
                                          label="Temporaire"
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {(() => {
                                        const discordStatus = getDiscordStatus(player);
                                        if (discordStatus === "none") {
                                          return (
                                            <Tooltip title="Aucun login Discord configuré">
                                              <Chip
                                                icon={<AlternateEmail fontSize="small" />}
                                                label="Pas Discord"
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                                sx={{
                                                  height: 18,
                                                  fontSize: "0.65rem",
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        }
                                        if (discordStatus === "invalid") {
                                          return (
                                            <Tooltip title="Au moins un login Discord n'existe plus sur le serveur">
                                              <Chip
                                                icon={<Warning fontSize="small" />}
                                                label="Discord invalide"
                                                size="small"
                                                color="warning"
                                                variant="outlined"
                                                sx={{
                                                  height: 18,
                                                  fontSize: "0.65rem",
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  );
                                }}
                                renderPlayerSecondary={(player) =>
                                  player.points !== undefined &&
                                  player.points !== null
                                    ? `${player.points} points`
                                    : "Points non disponibles"
                                }
                              />
                              {validationError && (
                                <Typography
                                  variant="caption"
                                  color="error"
                                  sx={{ mt: 1, display: "block" }}
                                >
                                  {validationError}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </TabPanel>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </AuthGuard>
    </DefaultCompositionsView>
  );
}


