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
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { EpreuveType } from "@/lib/shared/epreuve-utils";
import { useChampionshipTypes } from "@/hooks/useChampionshipTypes";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  validateTeamCompositionState,
} from "@/lib/compositions/validation";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { CompositionRulesHelp } from "@/components/compositions/CompositionRulesHelp";
import { CompositionTabPanel } from "@/components/compositions/CompositionTabPanel";
import { useMaxPlayersForTeam } from "@/hooks/useMaxPlayersForTeam";
import { useFilteredEquipes } from "@/hooks/useFilteredEquipes";
import { useEquipesByType } from "@/hooks/useEquipesByType";
import { useCanDropPlayer } from "@/hooks/useCanDropPlayer";
import { useCompositionDragDrop } from "@/hooks/useCompositionDragDrop";
import { AvailablePlayerItem } from "@/components/compositions/AvailablePlayerItem";
import { useCurrentPhase } from "@/hooks/useCurrentPhase";
import { useFilteredPlayers } from "@/hooks/useFilteredPlayers";
import { usePlayersWithoutAssignment } from "@/hooks/usePlayersWithoutAssignment";
import { useCompositionRules } from "@/hooks/useCompositionRules";
import { useCompositionPlayers } from "@/hooks/useCompositionPlayers";
import { CompositionSelectors } from "@/components/compositions/CompositionSelectors";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { CompositionTeamList } from "@/components/compositions/CompositionTeamList";

interface PhaseSelectOption {
  value: "aller" | "retour";
  label: string;
}

const MAX_PLAYERS_PER_DEFAULT_TEAM = 5;
const MIN_PLAYERS_FOR_DEFAULT_COMPLETION = 4;

export default function DefaultCompositionsPage() {
  const { loadBoth, createEmpty, isParisChampionship } = useChampionshipTypes();
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType>("championnat_equipes");
  const {
    players,
    loadingPlayers,
    loadPlayers,
    playerPool,
  } = useCompositionPlayers({
    includeAllPlayers: false,
    selectedEpreuve,
  });
  const isParis = useMemo(() => isParisChampionship(selectedEpreuve), [isParisChampionship, selectedEpreuve]);
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
  // draggedPlayerId et dragOverTeamId sont maintenant gérés par useCompositionDragDrop
  const [includeAllPlayers, setIncludeAllPlayers] = useState(false);
  const [discordMembers, setDiscordMembers] = useState<Array<{ id: string; username: string; displayName: string }>>([]);

  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );

  // Gestion de la phase actuelle
  useCurrentPhase({
    equipes,
    loadingEquipes,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  });

  // Charger les joueurs au montage
  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  // Charger les membres Discord
  useEffect(() => {
    const loadDiscordMembers = async () => {
      try {
        const response = await fetch("/api/discord/members", {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.members) {
            setDiscordMembers(result.members);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des membres Discord:", error);
      }
    };
    loadDiscordMembers();
  }, []);

  // getDiscordStatus est maintenant importé depuis @/lib/compositions/discord-utils

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
        
        // Utiliser loadBoth pour charger les compositions en parallèle
        const result = await loadBoth({
          loadMasculin: () => compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          loadFeminin: () => compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
          defaultValue: null,
        });

        setDefaultCompositions({
          masculin: result.data.masculin?.teams || {},
          feminin: result.data.feminin?.teams || {},
        });
        setDefaultCompositionMessage(null);
        console.log("[DefaultCompositions] Compositions chargées", {
          phase: selectedPhase,
          masculinTeams: Object.keys(result.data.masculin?.teams ?? {}),
          femininTeams: Object.keys(result.data.feminin?.teams ?? {}),
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions(createEmpty<Record<string, string[]>>({}));
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
  }, [selectedPhase, compositionDefaultsService, loadBoth, createEmpty]);

  // Filtrer les équipes selon l'épreuve sélectionnée
  const { filteredEquipes } = useFilteredEquipes(equipes, selectedEpreuve);

  // Grouper les équipes par type (masculin/féminin)
  const equipesByType = useEquipesByType(filteredEquipes);

  const mergedDefaultCompositions = useMemo(
    () => ({
      ...defaultCompositions.masculin,
      ...defaultCompositions.feminin,
    }),
    [defaultCompositions]
  );

  // championshipPlayers et playerPool sont maintenant fournis par useCompositionPlayers

  // Filtrer les joueurs selon le type de championnat
  const { availablePlayers } = useAvailablePlayers({
    players,
    playerPool,
    includeAllPlayers,
    selectedEpreuve,
    defaultCompositionTab,
  });

  // Filtrer les joueurs disponibles selon la recherche
  const filteredAvailablePlayers = useFilteredPlayers(
    availablePlayers,
    searchQuery
  );

  // Calculer les joueurs sans assignation
  const currentTeams = useMemo(() => {
    return selectedEpreuve === "championnat_paris"
      ? [...equipesByType.masculin, ...equipesByType.feminin]
      : defaultCompositionTab === "masculin"
      ? equipesByType.masculin
      : equipesByType.feminin;
  }, [selectedEpreuve, defaultCompositionTab, equipesByType]);

  const championshipTypeForAssignments = useMemo(() => {
    return selectedEpreuve === "championnat_paris"
      ? "masculin"
      : defaultCompositionTab;
  }, [selectedEpreuve, defaultCompositionTab]);

  const assignments = useMemo(() => {
    return defaultCompositions[championshipTypeForAssignments];
  }, [defaultCompositions, championshipTypeForAssignments]);

  const { availablePlayersWithoutAssignment, filteredAvailablePlayersWithoutAssignment } =
    usePlayersWithoutAssignment({
      availablePlayers,
      filteredAvailablePlayers,
      currentTeams,
      assignments,
    });

  // Calculer le maxPlayers selon l'épreuve et la division
  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  // Vérifier si un drop est possible
  const { canDropPlayer } = useCanDropPlayer({
    players,
    equipes,
    compositions: mergedDefaultCompositions,
    selectedPhase,
    selectedJournee: null,
    isParis,
  });

  useEffect(() => {
    if (!defaultCompositionsLoaded || selectedPhase === null) {
      setDefaultCompositionErrors({});
      return;
    }

    const nextErrors: Record<string, string | undefined> = {};

    Object.keys(mergedDefaultCompositions).forEach((teamId) => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : MAX_PLAYERS_PER_DEFAULT_TEAM;
      
      const validation = validateTeamCompositionState({
        teamId,
        players,
        equipes,
        compositions: mergedDefaultCompositions,
        selectedPhase,
        selectedJournee: null,
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

  // Gestion du drag & drop avec callbacks personnalisés
  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCompositionDragDrop({
    players,
    equipes,
    filteredEquipes,
    compositions: mergedDefaultCompositions,
    selectedPhase,
    selectedJournee: null,
    defaultCompositionTab,
    isParis,
    canDropPlayer,
    onDrop: async (playerId: string, teamId: string) => {
      await assignPlayerToTeam(teamId, playerId);
    },
    onRemovePlayer: async (teamId: string, playerId: string) => {
      await handleRemoveDefaultPlayer(teamId, playerId);
    },
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

  // Règles de composition
  const rulesForDefaults = useCompositionRules(selectedEpreuve, "defaults");

  const phaseOptions: PhaseSelectOption[] = [
    { value: "aller", label: "Phase aller" },
    { value: "retour", label: "Phase retour" },
  ];

  return (
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

          <CompositionSelectors
            selectedEpreuve={selectedEpreuve}
            selectedPhase={selectedPhase}
            selectedJournee={null}
            onEpreuveChange={(epreuve) => {
              setSelectedEpreuve(epreuve);
              setSelectedPhase(null); // Réinitialiser la phase lors du changement d'épreuve
            }}
            onPhaseChange={(phase) =>
              setSelectedPhase(
                phase ? (phase as "aller" | "retour") : null
              )
            }
            onJourneeChange={() => {}}
            isParis={isParis}
            journeesByPhase={new Map()}
            showJournee={false}
            phaseOptions={phaseOptions}
          />

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

              {selectedEpreuve !== "championnat_paris" && (
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                  <Tabs value={currentTabIndex} onChange={handleTabChange}>
                    <Tab label="Équipes Masculines" />
                    <Tab label="Équipes Féminines" />
                  </Tabs>
                </Box>
              )}

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
                    return (
                      <AvailablePlayerItem
                        player={player}
                        phase={phase}
                        championshipType={championshipType}
                        isParis={isParis}
                        selectedEpreuve={selectedEpreuve}
                        draggedPlayerId={draggedPlayerId}
                        discordMembers={discordMembers}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
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
                      label={
                        selectedEpreuve === "championnat_paris"
                          ? "Afficher tous les joueurs (hors championnat de Paris et sans licence)"
                          : "Afficher tous les joueurs (hors championnat et sans licence)"
                      }
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

                  <CompositionTabPanel value={currentTabIndex} index={0} prefix="default-compositions">
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
                        <CompositionTeamList
                          equipes={equipesToDisplay}
                          players={players}
                          defaultCompositions={defaultCompositions}
                          selectedEpreuve={selectedEpreuve}
                          selectedJournee={null}
                          selectedPhase={selectedPhase}
                          defaultCompositionTab={defaultCompositionTab}
                          isParis={selectedEpreuve === "championnat_paris"}
                          draggedPlayerId={draggedPlayerId}
                          dragOverTeamId={dragOverTeamId}
                          defaultCompositionErrors={defaultCompositionErrors}
                          mode="defaults"
                          onRemovePlayer={handleRemoveDefaultPlayer}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          completionThreshold={MIN_PLAYERS_FOR_DEFAULT_COMPLETION}
                        />
                      );
                    })()}
                  </CompositionTabPanel>

                  <CompositionTabPanel value={currentTabIndex} index={1} prefix="default-compositions">
                    <CompositionTeamList
                      equipes={equipesByType.feminin}
                      players={players}
                      defaultCompositions={defaultCompositions}
                      selectedEpreuve={selectedEpreuve}
                      selectedJournee={null}
                      selectedPhase={selectedPhase}
                      defaultCompositionTab={defaultCompositionTab}
                      isParis={selectedEpreuve === "championnat_paris"}
                      draggedPlayerId={draggedPlayerId}
                      dragOverTeamId={dragOverTeamId}
                      defaultCompositionErrors={defaultCompositionErrors}
                      mode="defaults"
                      onRemovePlayer={handleRemoveDefaultPlayer}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      completionThreshold={MIN_PLAYERS_FOR_DEFAULT_COMPLETION}
                    />
                  </CompositionTabPanel>
                </Box>
              </Box>
            </>
          )}
        </Box>
    </AuthGuard>
  );
}


