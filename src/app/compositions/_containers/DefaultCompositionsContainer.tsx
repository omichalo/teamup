"use client";

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
  FormControlLabel,
  Switch,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import {
  AlternateEmail,
  Warning,
} from "@mui/icons-material";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useTeamData, type EquipeWithMatches } from "@/hooks/useTeamData";
import { usePlayers } from "@/hooks/usePlayers";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { EpreuveType, getMatchEpreuve, isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { ChampionshipType } from "@/types";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  validateTeamCompositionState,
  getParisTeamStructure,
  isParisChampionship,
} from "@/lib/compositions/validators";
import {
  getPlayersByType,
  getTeamsByType,
} from "@/lib/compositions/championship-utils";
import { divisionIndicatesPhase2 } from "@/lib/shared/fftt-utils";
import type { Player } from "@/types/team-management";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { AvailablePlayerListItem } from "@/components/compositions/AvailablePlayerListItem";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { CompositionRulesHelp, type CompositionRuleItem } from "@/components/compositions/CompositionRulesHelp";
import { usePhasePreselect } from "@/hooks/usePhasePreselect";
import { useJourneesData } from "@/hooks/useJourneesData";
import { useDefaultCompositions } from "@/hooks/useDefaultCompositions";
import { useDefaultCompositionAssignments } from "@/hooks/useDefaultCompositionAssignments";
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
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
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
  const {
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
  } = useDefaultCompositions({
    selectedPhase,
    compositionDefaultsService,
  });

  const {
    defaultEpreuve,
    hasDataForEpreuve,
  } = useJourneesData(equipes, selectedEpreuve, selectedPhase);

  const hasInitializedEpreuve = React.useRef(false);
  useEffect(() => {
    if (!hasInitializedEpreuve.current && hasDataForEpreuve(defaultEpreuve)) {
      setSelectedEpreuve(defaultEpreuve);
      hasInitializedEpreuve.current = true;
    }
  }, [defaultEpreuve, hasDataForEpreuve, selectedEpreuve]);

  usePhasePreselect({
    equipes,
    loadingEquipes,
    currentPhase,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  });

  // Fonction helper pour vérifier le statut Discord d'un joueur
  const getDiscordStatus = useCallback((player: Player): "none" | "invalid" | "valid" => {
    if (!player.discordMentions || player.discordMentions.length === 0) {
      return "none";
    }
    const validMemberIds = new Set(discordMembers.map(m => m.id));
    const hasInvalidMention = player.discordMentions.some(mentionId => !validMemberIds.has(mentionId));
    return hasInvalidMention ? "invalid" : "valid";
  }, [discordMembers]);

  // Filtrer les équipes selon l'épreuve et la phase (même logique que CompositionsPageContainer)
  // Championnat Paris : pas de filtre par phase (une seule phase)
  // Championnat par équipes : Phase aller = équipes Phase 1, Phase retour = équipes Phase 2
  const filteredEquipes = useMemo(() => {
    if (!selectedEpreuve) {
      return equipes;
    }
    return equipes.filter((equipe) => {
      const epreuve = getMatchEpreuve(
        equipe.matches[0] || {},
        equipe.team
      );
      if (epreuve !== selectedEpreuve) return false;
      if (isParisEpreuve(selectedEpreuve)) return true;
      const division = equipe.team.division ?? "";
      if (selectedPhase === "aller") return !divisionIndicatesPhase2(division);
      if (selectedPhase === "retour") return divisionIndicatesPhase2(division);
      return true;
    });
  }, [equipes, selectedEpreuve, selectedPhase]);

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
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : defaultCompositionTab === "masculin"
          ? equipesByType.masculin
          : equipesByType.feminin;
    const championshipTypeForAssignments =
      isParisEpreuve(selectedEpreuve)
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
      // Vérifier si c'est une équipe pré-régionale féminine (format: DXX_Pre-Regionale Dames)
      const division = equipe.team.division || "";
      const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
      if (division.match(/Pre-Regionale/i) && isFemaleTeam) {
        return 3; // Pré-régionale féminine : 3 joueurs
      }
      return MAX_PLAYERS_PER_DEFAULT_TEAM; // Championnat par équipes : 5 joueurs par défaut
    },
    []
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

  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canDropPlayer,
    handleRemoveDefaultPlayer,
  } = useDefaultCompositionAssignments({
    players,
    equipes,
    equipesByType,
    defaultCompositions,
    setDefaultCompositions,
    selectedEpreuve,
    selectedPhase,
    defaultCompositionTab,
    mergedDefaultCompositions,
    getMaxPlayersForTeam,
    compositionDefaultsService,
    setDefaultCompositionMessage,
  });

  const compositionSummary = useMemo(() => {
    const currentTeams =
      // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
      isParisEpreuve(selectedEpreuve)
        ? [...equipesByType.masculin, ...equipesByType.feminin]
        : defaultCompositionTab === "masculin"
          ? equipesByType.masculin
          : equipesByType.feminin;
    const championshipTypeForAssignments =
      isParisEpreuve(selectedEpreuve)
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
      if (isParisEpreuve(selectedEpreuve)) {
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
                {!isParisEpreuve(selectedEpreuve) && (
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
                showFemale={!isParisEpreuve(selectedEpreuve)}
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
                    const burnedTeam =
                      defaultCompositionTab === "masculin"
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
                        showEligibilityChips
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
                        isParisEpreuve(selectedEpreuve)
                          ? [...equipesByType.masculin, ...equipesByType.feminin]
                          : equipesByType.masculin;

                      if (equipesToDisplay.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            {isParisEpreuve(selectedEpreuve)
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
                            isParisEpreuve(selectedEpreuve)
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


