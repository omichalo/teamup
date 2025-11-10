"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useMemo, useEffect, useCallback } from "react";                                                     
import Link from "next/link";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useEquipesWithMatches,
  type EquipeWithMatches,
} from "@/hooks/useEquipesWithMatches";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  canAssignPlayerToTeam,
  validateTeamCompositionState,
  AssignmentValidationResult,
} from "@/lib/compositions/validation";
import type { Player } from "@/types/team-management";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { createDragImage } from "@/lib/compositions/drag-utils";
import { CompositionRulesHelp, type CompositionRuleItem } from "@/components/compositions/CompositionRulesHelp";

interface PhaseSelectOption {
  value: "aller" | "retour";
  label: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const MAX_PLAYERS_PER_DEFAULT_TEAM = 5;
const MIN_PLAYERS_FOR_DEFAULT_COMPLETION = 4;

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`default-compositions-tabpanel-${index}`}
      aria-labelledby={`default-compositions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
}

export default function DefaultCompositionsPage() {
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
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
    "masculin" | "feminin"
  >("masculin");
  const [defaultCompositionMessage, setDefaultCompositionMessage] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  const [includeAllPlayers, setIncludeAllPlayers] = useState(false);

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );

  const currentPhase = useMemo(() => {
    if (loadingEquipes || equipes.length === 0) {
      return "aller" as const;
    }
    return getCurrentPhase(equipes);
  }, [equipes, loadingEquipes]);

  useEffect(() => {
    if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase]);

  const loadPlayers = useCallback(async () => {
    try {
      setLoadingPlayers(true);
      const fetchedPlayers = await playerService.getAllPlayers();
      setPlayers(
        fetchedPlayers.sort((a, b) => {
          const pointsDiff = (b.points || 0) - (a.points || 0);
          if (pointsDiff !== 0) {
            return pointsDiff;
          }
          return `${a.firstName} ${a.name}`.localeCompare(
            `${b.firstName} ${b.name}`
          );
        })
      );
    } catch (error) {
      console.error(
        "Erreur lors du chargement des joueurs depuis Firestore:",
        error
      );
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  }, [playerService]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

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

  const equipesByType = useMemo(() => {
    const masculin: EquipeWithMatches[] = [];
    const feminin: EquipeWithMatches[] = [];

    equipes.forEach((equipe) => {
      const isFemale = equipe.matches.some((match) => match.isFemale === true);
      if (isFemale) {
        feminin.push(equipe);
      } else {
        masculin.push(equipe);
      }
    });

    return { masculin, feminin };
  }, [equipes]);

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
        (player) => player.participation?.championnat === true && player.isActive
      ),
    [players]
  );

  const playerPool = useMemo(
    () => (includeAllPlayers ? players : championshipPlayers),
    [players, championshipPlayers, includeAllPlayers]
  );

  const availablePlayers = playerPool;

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
      defaultCompositionTab === "masculin"
        ? equipesByType.masculin
        : equipesByType.feminin;
    const assignments = defaultCompositions[defaultCompositionTab];

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
    defaultCompositions,
    equipesByType,
  ]);

  const canDropPlayer = useCallback(
    (playerId: string, teamId: string): AssignmentValidationResult => {
      return canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: MAX_PLAYERS_PER_DEFAULT_TEAM,
      });
    },
    [
      players,
      equipes,
      mergedDefaultCompositions,
      selectedPhase,
    ]
  );

  useEffect(() => {
    if (!defaultCompositionsLoaded || selectedPhase === null) {
      setDefaultCompositionErrors({});
      return;
    }

    const nextErrors: Record<string, string | undefined> = {};

    Object.keys(mergedDefaultCompositions).forEach((teamId) => {
      const validation = validateTeamCompositionState({
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
        maxPlayersPerTeam: MAX_PLAYERS_PER_DEFAULT_TEAM,
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

      const championshipType = equipe.matches.some(
        (match) => match.isFemale === true
      )
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

      if (currentTeamPlayers.length >= MAX_PLAYERS_PER_DEFAULT_TEAM) {
        setDefaultCompositionMessage(
          `Cette équipe est déjà complète (${MAX_PLAYERS_PER_DEFAULT_TEAM} joueurs).`
        );
        console.log("[DefaultCompositions] Ajout refusé : équipe pleine", {
          teamId,
          playerId,
          currentPlayerCount: currentTeamPlayers.length,
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
      compositionDefaultsService,
      equipesByType,
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

      const championshipType = equipe.matches.some(
        (match) => match.isFemale === true
      )
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
    [selectedPhase, equipes, compositionDefaultsService]
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, playerId: string) => {
      const target = event.target as HTMLElement;
      const clickedChip =
        target.closest('[data-chip="remove"]') ||
        target.closest('button[aria-label*="remove"]') ||
        (target.tagName === "BUTTON" && target.textContent?.trim() === "×");

      if (clickedChip || target.textContent?.trim() === "×") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.dataTransfer.setData("playerId", playerId);
      event.dataTransfer.effectAllowed = "move";
      setDraggedPlayerId(playerId);
      setDragOverTeamId(null);
      document.documentElement.classList.add("dragging");

      const player = players.find((p) => p.id === playerId);
      if (!player) {
        return;
      }

      let championshipType: "masculin" | "feminin" = defaultCompositionTab;
      const assignmentsByType = defaultCompositions;
      (["masculin", "feminin"] as const).forEach((type) => {
        const assignment = assignmentsByType[type];
        if (
          Object.values(assignment).some((ids) => ids?.includes(playerId))
        ) {
          championshipType = type;
        }
      });

      const tempDiv = createDragImage(player, {
        championshipType,
        phase: (selectedPhase || "aller") as "aller" | "retour",
      });
      document.body.appendChild(tempDiv);
      void tempDiv.offsetHeight;
      event.dataTransfer.setDragImage(tempDiv, 0, 0);
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 0);
    },
    [
      players,
      defaultCompositionTab,
      defaultCompositions,
      selectedPhase,
    ]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPlayerId(null);
    setDragOverTeamId(null);
    document.documentElement.classList.remove("dragging");
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, teamId: string) => {
      event.preventDefault();
      if (!draggedPlayerId) {
        return;
      }

      const validation = canDropPlayer(draggedPlayerId, teamId);
      event.dataTransfer.dropEffect = validation.canAssign ? "move" : "none";
      setDragOverTeamId(teamId);
    },
    [draggedPlayerId, canDropPlayer]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverTeamId(null);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent, teamId: string) => {
      event.preventDefault();
      const playerId = event.dataTransfer.getData("playerId");

      console.log("[DefaultCompositions] Drop event", { teamId, playerId });

      setDragOverTeamId(null);
      document.documentElement.classList.remove("dragging");

      if (!playerId) {
        setDraggedPlayerId(null);
        console.log("[DefaultCompositions] Drop aborted: missing playerId");
        return;
      }

      const validation = canDropPlayer(playerId, teamId);
      if (!validation.canAssign) {
        setDefaultCompositionMessage(
          validation.reason || "Composition invalide."
        );
        console.log("[DefaultCompositions] Drop refused by validation", {
          teamId,
          playerId,
          reason: validation.reason,
        });
        setDraggedPlayerId(null);
        return;
      }

      await assignPlayerToTeam(teamId, playerId);
      console.log("[DefaultCompositions] Drop processed, assignment triggered", {
        teamId,
        playerId,
      });
      event.dataTransfer.clearData();
      setDraggedPlayerId(null);
    },
    [assignPlayerToTeam, canDropPlayer]
  );

  const compositionSummary = useMemo(() => {
    const currentTeams =
      defaultCompositionTab === "masculin"
        ? equipesByType.masculin
        : equipesByType.feminin;
    const assignments = defaultCompositions[defaultCompositionTab];

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
    () => [
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
        label: "Respect du brûlage : impossible d'aligner un joueur dans une équipe de numéro inférieur",
        scope: "both",
      },
      {
        id: "fftt",
        label: "Points minimum (selon division nationale)",
        scope: "both",
      },
      {
        id: "defaults-specific",
        label: "Aucune limitation de journée (J2) sur cette page",
        scope: "defaults",
        description:
          "Les règles spécifiques à la J2 ne sont appliquées que lors de la préparation d'une composition de journée.",
      },
    ],
    []
  );

  const phaseOptions: PhaseSelectOption[] = [
    { value: "aller", label: "Phase aller" },
    { value: "retour", label: "Phase retour" },
  ];

  return (
    <AuthGuard>
      <Layout>
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

          <CompositionRulesHelp rules={rulesForDefaults} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="default-phase-label">Phase</InputLabel>
              <Select
                labelId="default-phase-label"
                label="Phase"
                value={selectedPhase || ""}
                onChange={(event) =>
                  setSelectedPhase(
                    event.target.value
                      ? (event.target.value as "aller" | "retour")
                      : null
                  )
                }
              >
                {phaseOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

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

              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={currentTabIndex} onChange={handleTabChange}>
                  <Tab label="Équipes Masculines" />
                  <Tab label="Équipes Féminines" />
                </Tabs>
              </Box>

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
                                {!player.isActive && (
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

                  <TabPanel value={currentTabIndex} index={0}>
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
                          const assignments =
                            defaultCompositions.masculin[equipe.team.id] || [];
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
                                maxPlayers={MAX_PLAYERS_PER_DEFAULT_TEAM}
                            completionThreshold={
                              MIN_PLAYERS_FOR_DEFAULT_COMPLETION
                            }
                                renderPlayerIndicators={(player) => {
                                  const phase = (selectedPhase ||
                                    "aller") as "aller" | "retour";
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

                  <TabPanel value={currentTabIndex} index={1}>
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
                                maxPlayers={MAX_PLAYERS_PER_DEFAULT_TEAM}
                            completionThreshold={
                              MIN_PLAYERS_FOR_DEFAULT_COMPLETION
                            }
                                renderPlayerIndicators={(player) => {
                                  const phase = (selectedPhase ||
                                    "aller") as "aller" | "retour";
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
      </Layout>
    </AuthGuard>
  );
}


