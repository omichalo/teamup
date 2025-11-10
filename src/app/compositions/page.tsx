"use client";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DragIndicator, ContentCopy, RestartAlt } from "@mui/icons-material";
import {
  useEquipesWithMatches,
  type EquipeWithMatches,
} from "@/hooks/useEquipesWithMatches";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AvailabilityService } from "@/lib/services/availability-service";
import { CompositionService } from "@/lib/services/composition-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { Player } from "@/types/team-management";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  AssignmentValidationResult,
  canAssignPlayerToTeam,
  getMatchForTeamAndJournee,
  getPlayersFromMatch,
  isMatchPlayed,
} from "@/lib/compositions/validation";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { createDragImage } from "@/lib/compositions/drag-utils";
import {
  CompositionRulesHelp,
  type CompositionRuleItem,
} from "@/components/compositions/CompositionRulesHelp";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`compositions-tabpanel-${index}`}
      aria-labelledby={`compositions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
}

export default function CompositionsPage() {
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  // État pour stocker les compositions : Map<teamId, playerIds[]>
  const [compositions, setCompositions] = useState<Record<string, string[]>>(
    {}
  );
  // État pour le joueur actuellement en train d'être dragué
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  // État pour l'équipe sur laquelle on survole avec le drag
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  // État pour la recherche de joueurs
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: (() => void) | (() => Promise<void>);
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirmer",
    cancelLabel: "Annuler",
  });
  const [defaultCompositions, setDefaultCompositions] = useState<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>({
    masculin: {},
    feminin: {},
  });
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] =
    useState(false);
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const availabilityService = useMemo(() => new AvailabilityService(), []);
  const compositionService = useMemo(() => new CompositionService(), []);
  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );

  const availablePlayersSubtitle = useMemo(() => {
    const base = tabValue === 0 ? "Masculin" : "Féminin";
    if (selectedJournee) {
      return `${base} - Journée ${selectedJournee}`;
    }
    return base;
  }, [tabValue, selectedJournee]);

  const compositionRules: CompositionRuleItem[] = useMemo(
    () => [
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
          "Respect du brûlage : impossible d'aligner un joueur dans une équipe de numéro inférieur",
        scope: "both",
      },
      {
        id: "fftt",
        label: "Points minimum (selon division nationale)",
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
    ],
    []
  );

  // Déterminer la phase en cours
  const currentPhase = useMemo(() => {
    if (loadingEquipes || equipes.length === 0) {
      return "aller" as const;
    }
    return getCurrentPhase(equipes);
  }, [equipes, loadingEquipes]);

  // Extraire les journées depuis les matchs, groupées par phase avec leurs dates
  const journeesByPhase = useMemo(() => {
    const journeesMap = new Map<
      "aller" | "retour",
      Map<number, { journee: number; phase: "aller" | "retour"; dates: Date[] }>
    >();

    equipes.forEach((equipe) => {
      equipe.matches.forEach((match) => {
        if (match.journee && match.phase) {
          const phase = match.phase.toLowerCase() as "aller" | "retour";
          if (phase === "aller" || phase === "retour") {
            if (!journeesMap.has(phase)) {
              journeesMap.set(phase, new Map());
            }
            const phaseMap = journeesMap.get(phase)!;
            const matchDate =
              match.date instanceof Date ? match.date : new Date(match.date);

            if (!phaseMap.has(match.journee)) {
              phaseMap.set(match.journee, {
                journee: match.journee,
                phase,
                dates: [matchDate],
              });
            } else {
              const journeeData = phaseMap.get(match.journee)!;
              // Ajouter la date si elle n'existe pas déjà (même jour)
              const dateStr = matchDate.toDateString();
              const exists = journeeData.dates.some(
                (d) => d.toDateString() === dateStr
              );
              if (!exists) {
                journeeData.dates.push(matchDate);
              }
            }
          }
        }
      });
    });

    // Trier les dates pour chaque journée
    journeesMap.forEach((phaseMap) => {
      phaseMap.forEach((journeeData) => {
        journeeData.dates.sort((a, b) => a.getTime() - b.getTime());
      });
    });

    return journeesMap;
  }, [equipes]);

  // Initialiser selectedPhase avec la phase en cours
  useEffect(() => {
    if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase]);

  // Initialiser selectedJournee avec la première journée dont la fin est après aujourd'hui
  useEffect(() => {
    if (
      selectedPhase !== null &&
      selectedJournee === null &&
      journeesByPhase.has(selectedPhase)
    ) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const journees = Array.from(
        journeesByPhase.get(selectedPhase)?.values() || []
      );

      const nextJournee = journees
        .sort((a, b) => a.journee - b.journee)
        .find(({ dates }) => {
          if (dates.length === 0) return false;
          const finJournee = new Date(
            Math.max(...dates.map((d) => d.getTime()))
          );
          finJournee.setHours(0, 0, 0, 0);
          return finJournee >= now;
        });

      if (nextJournee) {
        setSelectedJournee(nextJournee.journee);
      } else if (journees.length > 0) {
        const lastJournee = journees.sort((a, b) => b.journee - a.journee)[0];
        setSelectedJournee(lastJournee.journee);
      }
    }
  }, [selectedPhase, selectedJournee, journeesByPhase]);

  // Charger les joueurs
  const loadPlayers = useCallback(async () => {
    try {
      setLoadingPlayers(true);
      const allPlayers = await playerService.getAllPlayers();
      setPlayers(allPlayers);
    } catch (error) {
      console.error("Erreur lors du chargement des joueurs:", error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [playerService]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Charger les disponibilités pour la journée et phase sélectionnées
  const [availabilities, setAvailabilities] = useState<{
    masculin?: Record<string, { available: boolean; comment?: string }>;
    feminin?: Record<string, { available: boolean; comment?: string }>;
  }>({});

  useEffect(() => {
    if (!selectedPhase) {
      setDefaultCompositions({ masculin: {}, feminin: {} });
      setDefaultCompositionsLoaded(false);
      return;
    }

    setDefaultCompositionsLoaded(false);

    const loadDefaults = async () => {
      try {
        const [masculineDefaults, feminineDefaults] = await Promise.all([
          compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
        ]);

        setDefaultCompositions({
          masculin: masculineDefaults?.teams || {},
          feminin: feminineDefaults?.teams || {},
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions({ masculin: {}, feminin: {} });
      }

      setDefaultCompositionsLoaded(true);
    };

    loadDefaults();
  }, [selectedPhase, compositionDefaultsService]);

  useEffect(() => {
    if (selectedJournee !== null && selectedPhase !== null) {
      setAvailabilitiesLoaded(false);
      const loadAvailability = async () => {
        try {
          const [masculineAvailability, feminineAvailability] =
            await Promise.all([
              availabilityService.getAvailability(
                selectedJournee,
                selectedPhase,
                "masculin"
              ),
              availabilityService.getAvailability(
                selectedJournee,
                selectedPhase,
                "feminin"
              ),
            ]);

          setAvailabilities({
            masculin: masculineAvailability?.players || {},
            feminin: feminineAvailability?.players || {},
          });
        } catch (error) {
          console.error("Erreur lors du chargement des disponibilités:", error);
          setAvailabilities({});
        } finally {
          setAvailabilitiesLoaded(true);
        }
      };
      loadAvailability();
    } else {
      setAvailabilities({});
      setAvailabilitiesLoaded(false);
    }
  }, [selectedJournee, selectedPhase, availabilityService]);

  // Filtrer les joueurs disponibles selon l'onglet sélectionné
  const availablePlayers = useMemo(() => {
    if (selectedJournee === null || selectedPhase === null) {
      return [];
    }

    const championshipType = tabValue === 0 ? "masculin" : "feminin";
    const availabilityMap = availabilities[championshipType] || {};

    return players.filter((player) => {
      // Vérifier la disponibilité selon le type de championnat
      const playerAvailability = availabilityMap[player.id];

      // Si pas de réponse, ne pas afficher (seulement les joueurs qui ont répondu)
      if (!playerAvailability) {
        return false;
      }

      // Afficher seulement les joueurs disponibles (available === true)
      return playerAvailability.available === true;
    });
  }, [players, availabilities, tabValue, selectedJournee, selectedPhase]);

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

  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setCompositions({});
      return;
    }

    let isCancelled = false;
    const championshipType = tabValue === 0 ? "masculin" : "feminin";

    const loadComposition = async () => {
      try {
        const composition = await compositionService.getComposition(
          selectedJournee,
          selectedPhase,
          championshipType
        );

        if (isCancelled) {
          return;
        }

        if (composition) {
          setCompositions(composition.teams);
          return;
        }

        if (!defaultCompositionsLoaded || !availabilitiesLoaded) {
          setCompositions({});
          return;
        }

        const defaultsForType = defaultCompositions[championshipType] || {};
        const availabilityMap =
          (championshipType === "masculin"
            ? availabilities.masculin
            : availabilities.feminin) || {};

        const initialTeams = Object.fromEntries(
          Object.entries(defaultsForType).map(([teamId, playerIds]) => {
            const availablePlayerIds = playerIds
              .filter((id) => availabilityMap[id]?.available === true)
              .slice(0, 4);
            return [teamId, availablePlayerIds];
          })
        );

        setCompositions(initialTeams);
      } catch (error) {
        if (!isCancelled) {
          console.error("Erreur lors du chargement des compositions:", error);
          setCompositions({});
        }
      }
    };

    loadComposition();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedJournee,
    selectedPhase,
    tabValue,
    compositionService,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilities,
    availabilitiesLoaded,
  ]);

  // Grouper les équipes par type (masculin/féminin)
  const equipesByType = useMemo(() => {
    const masculin: typeof equipes = [];
    const feminin: typeof equipes = [];

    equipes.forEach((equipe) => {
      // Déterminer si c'est une équipe féminine en regardant les matchs
      const isFemale = equipe.matches.some((match) => match.isFemale === true);

      if (isFemale) {
        feminin.push(equipe);
      } else {
        masculin.push(equipe);
      }
    });

    return { masculin, feminin };
  }, [equipes]);

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
    const sameTypeEquipes =
      tabValue === 0 ? equipesByType.masculin : equipesByType.feminin;
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

  const compositionSummary = useMemo(() => {
    const currentTypeEquipes =
      tabValue === 0 ? equipesByType.masculin : equipesByType.feminin;

    let equipesCompletes = 0;
    let equipesIncompletes = 0;
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

      if (teamPlayersData.length >= 4) {
        equipesCompletes += 1;
      } else {
        equipesIncompletes += 1;
      }
    });

    const totalEditable = equipesCompletes + equipesIncompletes;
    const percentage =
      totalEditable > 0
        ? Math.round((equipesCompletes / totalEditable) * 100)
        : 0;

    return {
      totalEditable,
      equipesCompletes,
      equipesIncompletes,
      equipesMatchsJoues,
      percentage,
    };
  }, [tabValue, equipesByType, compositions, players, getMatchForTeam]);

  // Fonction pour vérifier si un drop est possible
  const canDropPlayer = (
    playerId: string,
    teamId: string
  ): AssignmentValidationResult => {
    return canAssignPlayerToTeam({
      playerId,
      teamId,
      players,
      equipes,
      compositions,
      selectedPhase,
      selectedJournee,
      journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
    });
  };

  // Gestion du drag & drop
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    // Empêcher le drag si on clique sur le Chip de suppression ou un de ses enfants
    const target = e.target as HTMLElement;

    // Vérifier si le clic provient du Chip de suppression ou d'un de ses enfants
    const clickedChip =
      target.closest('[data-chip="remove"]') ||
      target.closest('button[aria-label*="remove"]') ||
      (target.tagName === "BUTTON" && target.textContent?.trim() === "×");

    if (clickedChip || target.textContent?.trim() === "×") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedPlayerId(playerId);
    // S'assurer que dragOverTeamId est null au début du drag
    setDragOverTeamId(null);

    // Ajouter une classe au <html> pour forcer le curseur pendant le drag
    // Le style CSS global gérera le curseur (défini dans globals.css)
    document.documentElement.classList.add("dragging");

    // Créer une image personnalisée pour le drag (seulement le contenu de l'élément)
    const player = players.find((p) => p.id === playerId);

    if (!player) {
      return;
    }

    // Déterminer le type de championnat pour le brûlage
    // Si le joueur est dans une équipe, utiliser le type de l'équipe
    // Sinon, utiliser le tab actuel (liste disponible)
    const equipe = equipes.find((eq) => {
      const teamPlayers = compositions[eq.team.id] || [];
      return teamPlayers.includes(playerId);
    });
    const championshipType = equipe
      ? equipe.matches.some((match) => match.isFemale === true)
        ? "feminin"
        : "masculin"
      : tabValue === 0
      ? "masculin"
      : "feminin";

    // Créer l'image de drag uniforme (mutualisée pour les deux cas)
    const tempDiv = createDragImage(player, {
      championshipType,
      phase: (selectedPhase || "aller") as "aller" | "retour",
    });
    document.body.appendChild(tempDiv);

    // Forcer un reflow pour s'assurer que les dimensions sont calculées
    void tempDiv.offsetHeight;

    // Utiliser l'élément temporaire comme image de drag
    e.dataTransfer.setDragImage(tempDiv, 0, 0);

    // Nettoyer après un court délai
    setTimeout(() => {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setDragOverTeamId(null);

    // Retirer la classe du <html> pour restaurer le curseur par défaut
    document.documentElement.classList.remove("dragging");

    // Nettoyer le style injecté si présent (sécurité)
    const style = document.getElementById("drag-cursor-style");
    if (style) {
      style.remove();
    }
  };

  // Nettoyer le drag si le drop se fait hors zone
  useEffect(() => {
    const clearDrag = () => {
      document.documentElement.classList.remove("dragging");
      const style = document.getElementById("drag-cursor-style");
      if (style) {
        style.remove();
      }
      setDraggedPlayerId(null);
      setDragOverTeamId(null);
    };

    window.addEventListener("drop", clearDrag);
    window.addEventListener("dragend", clearDrag);

    return () => {
      window.removeEventListener("drop", clearDrag);
      window.removeEventListener("dragend", clearDrag);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent, teamId: string) => {
    e.preventDefault();
    setDragOverTeamId(teamId);

    if (draggedPlayerId) {
      const validation = canDropPlayer(draggedPlayerId, teamId);
      e.dataTransfer.dropEffect = validation.canAssign ? "move" : "none";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = () => {
    setDragOverTeamId(null);
  };

  const handleDrop = (e: React.DragEvent, teamId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");

    // Réinitialiser les états de drag immédiatement
    setDragOverTeamId(null);

    if (!playerId) {
      setDraggedPlayerId(null);
      return;
    }

    // Trouver le joueur et l'équipe
    const player = players.find((p) => p.id === playerId);
    const equipe = equipes.find((eq) => eq.team.id === teamId);

    if (!player || !equipe) {
      return;
    }

    const validation = canDropPlayer(playerId, teamId);
    if (!validation.canAssign) {
      setDraggedPlayerId(null);
      return;
    }

    const isFemaleTeam = equipe.matches.some(
      (match) => match.isFemale === true
    );
    const championshipType = isFemaleTeam ? "feminin" : "masculin";

    setCompositions((prev) => {
      const latestValidation = canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions: prev,
        selectedPhase,
        selectedJournee,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
      });

      if (!latestValidation.canAssign) {
        return prev;
      }

      const currentTeamPlayers = prev[teamId] || [];

      // Ne pas ajouter si le joueur est déjà dans l'équipe (même équipe)
      if (currentTeamPlayers.includes(playerId)) {
        return prev;
      }

      // Retirer le joueur de toutes les autres équipes du même type (masculin/féminin)
      const updatedCompositions = { ...prev };
      const isFemaleTeam = equipe.matches.some(
        (match) => match.isFemale === true
      );

      // Trouver toutes les équipes du même type (masculin ou féminin)
      const sameTypeEquipes = equipes.filter((eq) => {
        const eqIsFemale = eq.matches.some((match) => match.isFemale === true);
        return eqIsFemale === isFemaleTeam;
      });

      // Retirer le joueur de toutes les équipes du même type
      sameTypeEquipes.forEach((eq) => {
        if (updatedCompositions[eq.team.id]) {
          updatedCompositions[eq.team.id] = updatedCompositions[
            eq.team.id
          ].filter((id) => id !== playerId);
        }
      });

      // Limiter à 4 joueurs maximum par équipe
      const targetTeamPlayers = updatedCompositions[teamId] || [];
      if (targetTeamPlayers.length >= 4) {
        return prev;
      }

      // Vérifier si le joueur est étranger (ETR) et si l'équipe a déjà un joueur étranger
      if (player.nationality === "ETR") {
        const targetTeamPlayersData = targetTeamPlayers
          .map((pid) => players.find((p) => p.id === pid))
          .filter((p): p is Player => p !== undefined);

        const hasForeignPlayer = targetTeamPlayersData.some(
          (p) => p.nationality === "ETR"
        );

        if (hasForeignPlayer) {
          return prev; // Ne pas ajouter le joueur
        }
      }

      // Ajouter le joueur à la nouvelle équipe
      const newCompositions = {
        ...updatedCompositions,
        [teamId]: [...targetTeamPlayers, playerId],
      };

      setDefaultCompositions((prev) => ({
        ...prev,
        [championshipType]: newCompositions,
      }));

      // Sauvegarder les compositions
      if (selectedJournee !== null && selectedPhase !== null) {
        const saveComposition = async () => {
          try {
            await compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType,
              teams: newCompositions,
            });
          } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
          }
        };
        saveComposition();
      }

      return newCompositions;
    });

    // Réinitialiser draggedPlayerId après le drop pour éviter que le message s'affiche
    setDraggedPlayerId(null);
  };

  // Retirer un joueur d'une équipe
  const handleRemovePlayer = (teamId: string, playerId: string) => {
    setCompositions((prev) => {
      const currentTeamPlayers = prev[teamId] || [];
      const equipe = equipes.find((eq) => eq.team.id === teamId);
      const isFemaleTeam = equipe?.matches.some(
        (match) => match.isFemale === true
      );
      const championshipType = isFemaleTeam ? "feminin" : "masculin";

      const newCompositions = {
        ...prev,
        [teamId]: currentTeamPlayers.filter((id) => id !== playerId),
      };

      if (championshipType) {
        setDefaultCompositions((prevDefaults) => ({
          ...prevDefaults,
          [championshipType]: newCompositions,
        }));
      }

      // Sauvegarder les compositions
      if (selectedJournee !== null && selectedPhase !== null) {
        const saveComposition = async () => {
          try {
            await compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType,
              teams: newCompositions,
            });
          } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
          }
        };
        saveComposition();
      }

      return newCompositions;
    });
  };

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

    console.log("[Compositions] Reset compositions started", {
      journee: selectedJournee,
      phase: selectedPhase,
    });

    setIsResetting(true);

    const previousState: Record<string, string[]> = Object.fromEntries(
      Object.entries(compositions).map(([teamId, playerIds]) => [
        teamId,
        [...playerIds],
      ])
    );

    const masculineTeamIds = equipesByType.masculin.map(
      (equipe) => equipe.team.id
    );
    const feminineTeamIds = equipesByType.feminin.map(
      (equipe) => equipe.team.id
    );

    const emptyTeamsEntries = [
      ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
      ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
    ];
    const emptyTeams = Object.fromEntries(emptyTeamsEntries);

    setCompositions(emptyTeams);

    try {
      await Promise.all([
        masculineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "masculin",
              teams: Object.fromEntries(
                masculineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  [],
                ])
              ),
            })
          : Promise.resolve(),
        feminineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "feminin",
              teams: Object.fromEntries(
                feminineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  [],
                ])
              ),
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation des compositions:",
        error
      );
      console.log("[Compositions] Reset compositions failed", {
        journee: selectedJournee,
        phase: selectedPhase,
        error,
      });
      setCompositions(previousState);
    } finally {
      setIsResetting(false);
      console.log("[Compositions] Reset compositions finished", {
        journee: selectedJournee,
        phase: selectedPhase,
      });
    }
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

    setIsApplyingDefaults(true);

    const previousState: Record<string, string[]> = Object.fromEntries(
      Object.entries(compositions).map(([teamId, playerIds]) => [
        teamId,
        [...playerIds],
      ])
    );

    try {
      const masculineTeamIds = equipesByType.masculin.map(
        (equipe) => equipe.team.id
      );
      const feminineTeamIds = equipesByType.feminin.map(
        (equipe) => equipe.team.id
      );

      console.log("[Compositions] Apply defaults started", {
        journee: selectedJournee,
        phase: selectedPhase,
        masculineTeamIds,
        feminineTeamIds,
      });

      const nextCompositions: Record<string, string[]> = Object.fromEntries([
        ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
        ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
      ]);

      const processType = (
        championshipType: "masculin" | "feminin",
        teamIds: string[]
      ) => {
        const defaultsForType = defaultCompositions[championshipType] || {};
        const availabilityMap =
          (championshipType === "masculin"
            ? availabilities.masculin
            : availabilities.feminin) || {};
        const assignedPlayersForType = new Set<string>();

        teamIds.forEach((teamId) => {
          const defaultPlayers = defaultsForType[teamId] || [];
          const nextTeamPlayers: string[] = [];

          defaultPlayers.forEach((playerId) => {
            if (nextTeamPlayers.length >= 4) {
              return;
            }

            if (assignedPlayersForType.has(playerId)) {
              return;
            }

            const availability = availabilityMap[playerId];
            if (!availability || availability.available !== true) {
              console.log("[Compositions] Player skipped (not available)", {
                playerId,
                teamId,
                championshipType,
                availability,
              });
              return;
            }

            const player = players.find((p) => p.id === playerId);
            if (!player) {
              console.log("[Compositions] Player skipped (not found)", {
                playerId,
                teamId,
                championshipType,
              });
              return;
            }

            const simulatedCompositions: Record<string, string[]> = {
              ...nextCompositions,
              [teamId]: [...nextTeamPlayers, playerId],
            };

            const validation = canAssignPlayerToTeam({
              playerId,
              teamId,
              players,
              equipes,
              compositions: simulatedCompositions,
              selectedPhase,
              selectedJournee,
              journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
            });

            if (!validation.canAssign) {
              console.log("[Compositions] Player skipped (validation failed)", {
                playerId,
                teamId,
                championshipType,
                reason: validation.reason,
              });
              return;
            }

            nextTeamPlayers.push(playerId);
            assignedPlayersForType.add(playerId);
            console.log("[Compositions] Player added from defaults", {
              playerId,
              teamId,
              championshipType,
              nextTeamPlayers,
            });
          });

          nextCompositions[teamId] = nextTeamPlayers;
        });
      };

      processType("masculin", masculineTeamIds);
      processType("feminin", feminineTeamIds);

      setCompositions(nextCompositions);
      console.log("[Compositions] Apply defaults next state", nextCompositions);

      await Promise.all([
        masculineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "masculin",
              teams: Object.fromEntries(
                masculineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  nextCompositions[teamId] || [],
                ])
              ),
            })
          : Promise.resolve(),
        feminineTeamIds.length > 0
          ? compositionService.saveComposition({
              journee: selectedJournee,
              phase: selectedPhase,
              championshipType: "feminin",
              teams: Object.fromEntries(
                feminineTeamIds.map<[string, string[]]>((teamId) => [
                  teamId,
                  nextCompositions[teamId] || [],
                ])
              ),
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error(
        "Erreur lors de la copie des compositions par défaut:",
        error
      );
      console.log("[Compositions] Apply defaults failed", {
        journee: selectedJournee,
        phase: selectedPhase,
        error,
      });
      setCompositions(previousState);
    } finally {
      setIsApplyingDefaults(false);
      console.log("[Compositions] Apply defaults finished", {
        journee: selectedJournee,
        phase: selectedPhase,
      });
    }
  }, [
    availabilities,
    availabilitiesLoaded,
    compositionService,
    compositions,
    defaultCompositions,
    defaultCompositionsLoaded,
    equipes,
    equipesByType,
    hasDefaultCompositions,
    isApplyingDefaults,
    players,
    selectedJournee,
    selectedPhase,
  ]);

  const handleResetButtonClick = useCallback(() => {
    if (!canResetButton) {
      return;
    }

    setConfirmationDialog({
      open: true,
      title: "Réinitialiser les compositions",
      description:
        selectedJournee !== null
          ? `Réinitialiser toutes les compositions (masculines et féminines) pour la journée ${selectedJournee} ?`
          : "Réinitialiser toutes les compositions ?",
      confirmLabel: "Réinitialiser",
      cancelLabel: "Annuler",
      onConfirm: () => {
        void runResetCompositions();
      },
    });
  }, [canResetButton, runResetCompositions, selectedJournee]);

  const handleApplyDefaultsClick = useCallback(() => {
    if (!canCopyDefaultsButton) {
      return;
    }

    if (hasAssignedPlayers) {
      setConfirmationDialog({
        open: true,
        title: "Remplacer par les compositions par défaut",
        description:
          selectedJournee !== null
            ? `Des compositions existent pour la journée ${selectedJournee}. Les remplacer par les compositions par défaut (toutes équipes) ?`
            : "Des compositions existent déjà. Les remplacer par les compositions par défaut ?",
        confirmLabel: "Remplacer",
        cancelLabel: "Annuler",
        onConfirm: () => {
          void runApplyDefaultCompositions();
        },
      });
      return;
    }

    void runApplyDefaultCompositions();
  }, [
    canCopyDefaultsButton,
    hasAssignedPlayers,
    runApplyDefaultCompositions,
    selectedJournee,
  ]);

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirmDialog = useCallback(() => {
    const action = confirmationDialog.onConfirm;
    setConfirmationDialog((prev) => ({
      ...prev,
      open: false,
      onConfirm: undefined,
    }));
    if (action) {
      void action();
    }
  }, [confirmationDialog]);

  if (loadingEquipes || loadingPlayers) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 5 }}>
          <Dialog
            open={confirmationDialog.open}
            onClose={handleCancelConfirmation}
            aria-labelledby="composition-confirmation-dialog-title"
          >
            <DialogTitle id="composition-confirmation-dialog-title">
              {confirmationDialog.title}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {confirmationDialog.description}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelConfirmation}>
                {confirmationDialog.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                onClick={handleConfirmDialog}
                variant="contained"
                color="primary"
              >
                {confirmationDialog.confirmLabel ?? "Confirmer"}
              </Button>
            </DialogActions>
          </Dialog>

          <Typography variant="h4" gutterBottom>
            Composition des Équipes
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Composez les équipes pour une journée de championnat.
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Phase</InputLabel>
                  <Select
                    value={selectedPhase || ""}
                    label="Phase"
                    onChange={(e) => {
                      const phase = e.target.value as "aller" | "retour";
                      setSelectedPhase(phase);
                      setSelectedJournee(null);
                    }}
                  >
                    <MenuItem value="aller">Phase Aller</MenuItem>
                    <MenuItem value="retour">Phase Retour</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Journée</InputLabel>
                  <Select
                    value={selectedJournee || ""}
                    label="Journée"
                    onChange={(e) =>
                      setSelectedJournee(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={selectedPhase === null}
                  >
                    {selectedPhase &&
                      Array.from(
                        journeesByPhase.get(selectedPhase)?.values() || []
                      )
                        .sort((a, b) => a.journee - b.journee)
                        .map(({ journee, dates }) => {
                          const datesFormatted = dates
                            .map((date) => {
                              return new Intl.DateTimeFormat("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                              }).format(date);
                            })
                            .join(", ");
                          return (
                            <MenuItem key={journee} value={journee}>
                              Journée {journee} - {datesFormatted}
                            </MenuItem>
                          );
                        })}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          <Box
            sx={{
              mb: 3,
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Button
              component={Link}
              href="/compositions/defaults"
              variant="outlined"
            >
              Gérer les compositions par défaut
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ContentCopy />}
              disabled={!canCopyDefaultsButton}
              onClick={handleApplyDefaultsClick}
            >
              Copier les compos par défaut (toutes équipes)
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RestartAlt />}
              disabled={!canResetButton}
              onClick={handleResetButtonClick}
            >
              Réinitialiser toutes les compos
            </Button>
          </Box>

          <CompositionRulesHelp rules={compositionRules} />

          {selectedJournee && selectedPhase ? (
            <>
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="Équipes Masculines" />
                  <Tab label="Équipes Féminines" />
                </Tabs>
              </Box>

              <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
                <AvailablePlayersPanel
                  title="Joueurs disponibles"
                  subtitle={availablePlayersSubtitle}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalCount={availablePlayersWithoutAssignment.length}
                  filteredPlayers={filteredAvailablePlayersWithoutAssignment}
                  emptyMessage="Aucun joueur disponible"
                  noResultMessage={(query) =>
                    `Aucun joueur trouvé pour “${query}”`
                  }
                  renderPlayerItem={(player) => {
                    const phase = selectedPhase || "aller";
                    const championshipType =
                      tabValue === 0 ? "masculin" : "feminin";
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
                          onDragStart={(event) =>
                            handleDragStart(event, player.id)
                          }
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
                                draggedPlayerId === player.id
                                  ? "grabbing"
                                  : "grab",
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
                                {burnedTeam !== undefined &&
                                  burnedTeam !== null && (
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
                              </Box>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {player.points !== undefined &&
                                player.points !== null
                                  ? `${player.points} points`
                                  : "Points non disponibles"}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  }}
                />

                <Box sx={{ flex: 1 }}>
                  <CompositionsSummary
                    totalTeams={compositionSummary.totalEditable}
                    completedTeams={compositionSummary.equipesCompletes}
                    incompleteTeams={compositionSummary.equipesIncompletes}
                    matchesPlayed={compositionSummary.equipesMatchsJoues}
                    percentage={compositionSummary.percentage}
                  />

                  <TabPanel value={tabValue} index={0}>
                    {equipesByType.masculin.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucune équipe masculine
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {equipesByType.masculin.map((equipe) => {
                          const match = getMatchForTeam(equipe);
                          const matchPlayed = isMatchPlayed(match);
                          const teamPlayers = matchPlayed
                            ? getPlayersFromMatch(match, players)
                            : (compositions[equipe.team.id] || [])
                                .map((playerId) =>
                                  players.find((p) => p.id === playerId)
                                )
                                .filter((p): p is Player => p !== undefined);

                          const teamPlayersData =
                            Array.isArray(teamPlayers) &&
                            teamPlayers.every((p) => "id" in p)
                              ? teamPlayers
                              : [];

                          const isDragOver =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id;

                          const dropCheck =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : {
                                  canAssign: true,
                                  reason: undefined,
                                  simulatedPlayers: teamPlayersData,
                                };
                          const canDrop = matchPlayed
                            ? false
                            : dropCheck.canAssign;
                          const dragHandlers = matchPlayed
                            ? undefined
                            : {
                                onDragOver: (event: React.DragEvent) =>
                                  handleDragOver(event, equipe.team.id),
                                onDragLeave: handleDragLeave,
                                onDrop: (event: React.DragEvent) =>
                                  handleDrop(event, equipe.team.id),
                              };

                          return (
                            <TeamCompositionCard
                              key={equipe.team.id}
                              equipe={equipe}
                              players={teamPlayersData}
                              onRemovePlayer={(playerId) =>
                                handleRemovePlayer(equipe.team.id, playerId)
                              }
                              onPlayerDragStart={(event, playerId) =>
                                handleDragStart(event, playerId)
                              }
                              onPlayerDragEnd={handleDragEnd}
                              isDragOver={Boolean(isDragOver)}
                              canDrop={canDrop}
                              dropReason={dropCheck.reason}
                              draggedPlayerId={draggedPlayerId}
                              dragOverTeamId={dragOverTeamId}
                              matchPlayed={matchPlayed}
                              renderPlayerIndicators={(player) => {
                                const phase = selectedPhase || "aller";
                                const burnedTeam =
                                  player.highestMasculineTeamNumberByPhase?.[
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
                                  </>
                                );
                              }}
                              renderPlayerSecondary={(player) =>
                                player.points !== undefined &&
                                player.points !== null
                                  ? `${player.points} points`
                                  : "Points non disponibles"
                              }
                              {...(dragHandlers ?? {})}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </TabPanel>

                  <TabPanel value={tabValue} index={1}>
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
                          const match = getMatchForTeam(equipe);
                          const matchPlayed = isMatchPlayed(match);
                          const teamPlayers = matchPlayed
                            ? getPlayersFromMatch(match, players)
                            : (compositions[equipe.team.id] || [])
                                .map((playerId) =>
                                  players.find((p) => p.id === playerId)
                                )
                                .filter((p): p is Player => p !== undefined);

                          const teamPlayersData =
                            Array.isArray(teamPlayers) &&
                            teamPlayers.every((p) => "id" in p)
                              ? teamPlayers
                              : [];

                          const isDragOver =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id;
                          const dropCheck =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : {
                                  canAssign: true,
                                  reason: undefined,
                                  simulatedPlayers: teamPlayersData,
                                };
                          const canDrop = matchPlayed
                            ? false
                            : dropCheck.canAssign;
                          const dragHandlers = matchPlayed
                            ? undefined
                            : {
                                onDragOver: (event: React.DragEvent) =>
                                  handleDragOver(event, equipe.team.id),
                                onDragLeave: handleDragLeave,
                                onDrop: (event: React.DragEvent) =>
                                  handleDrop(event, equipe.team.id),
                              };

                          return (
                            <TeamCompositionCard
                              key={equipe.team.id}
                              equipe={equipe}
                              players={teamPlayersData}
                              onRemovePlayer={(playerId) =>
                                handleRemovePlayer(equipe.team.id, playerId)
                              }
                              onPlayerDragStart={(event, playerId) =>
                                handleDragStart(event, playerId)
                              }
                              onPlayerDragEnd={handleDragEnd}
                              isDragOver={Boolean(isDragOver)}
                              canDrop={canDrop}
                              dropReason={dropCheck.reason}
                              draggedPlayerId={draggedPlayerId}
                              dragOverTeamId={dragOverTeamId}
                              matchPlayed={matchPlayed}
                              renderPlayerIndicators={(player) => {
                                const phase = selectedPhase || "aller";
                                const burnedTeam =
                                  player.highestFeminineTeamNumberByPhase?.[
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
                                  </>
                                );
                              }}
                              renderPlayerSecondary={(player) =>
                                player.points !== undefined &&
                                player.points !== null
                                  ? `${player.points} points`
                                  : "Points non disponibles"
                              }
                              {...(dragHandlers ?? {})}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </TabPanel>
                </Box>
              </Box>
            </>
          ) : null}

          {(!selectedJournee || !selectedPhase) && (
            <Card>
              <CardContent>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  align="center"
                >
                  Veuillez sélectionner une phase et une journée pour commencer
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
}
