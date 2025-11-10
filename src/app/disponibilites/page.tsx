"use client";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Search as SearchIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AvailabilityService } from "@/lib/services/availability-service";
import { Player } from "@/types/team-management";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { getCurrentPhase } from "@/lib/shared/phase-utils";

interface AvailabilityResponse {
  available: boolean;
  comment?: string;
}

export default function DisponibilitesPage() {
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  // Structure: { playerId: { masculin?: AvailabilityResponse, feminin?: AvailabilityResponse } }
  const [availabilities, setAvailabilities] = useState<
    Record<
      string,
      {
        masculin?: AvailabilityResponse;
        feminin?: AvailabilityResponse;
      }
    >
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const commentSaveTimeoutRef = React.useRef<
    Record<string, { masculin?: NodeJS.Timeout; feminin?: NodeJS.Timeout }>
  >({});
  const availabilitiesRef = React.useRef<
    Record<
      string,
      {
        masculin?: AvailabilityResponse;
        feminin?: AvailabilityResponse;
      }
    >
  >({});

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const availabilityService = useMemo(() => new AvailabilityService(), []);

  // Mettre à jour la ref quand availabilities change
  useEffect(() => {
    availabilitiesRef.current = availabilities;
  }, [availabilities]);

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
      now.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer uniquement les dates

      const journees = Array.from(
        journeesByPhase.get(selectedPhase)?.values() || []
      );

      // Trouver la première journée dont la fin (date maximale) est après aujourd'hui
      const nextJournee = journees
        .sort((a, b) => a.journee - b.journee) // Trier par numéro de journée
        .find(({ dates }) => {
          if (dates.length === 0) return false;
          // La fin de la journée = date maximale
          const finJournee = new Date(
            Math.max(...dates.map((d) => d.getTime()))
          );
          finJournee.setHours(0, 0, 0, 0);
          return finJournee >= now;
        });

      if (nextJournee) {
        setSelectedJournee(nextJournee.journee);
      } else if (journees.length > 0) {
        // Si aucune journée future, sélectionner la dernière
        const lastJournee = journees.sort((a, b) => b.journee - a.journee)[0];
        setSelectedJournee(lastJournee.journee);
      }
    }
  }, [selectedPhase, selectedJournee, journeesByPhase]);

  // Filtrer les joueurs selon les critères
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    // Par défaut, seuls les joueurs participant au championnat
    if (!showAllPlayers) {
      filtered = filtered.filter((p) => p.participation?.championnat === true);
    }

    // Filtre de recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.firstName.toLowerCase().includes(query) ||
          (p.license && p.license.includes(query))
      );
    }

    return filtered;
  }, [players, showAllPlayers, searchQuery]);

  // Séparer les joueurs ayant répondu et ceux en attente
  const { respondedPlayers, pendingPlayers } = useMemo(() => {
    const responded: Player[] = [];
    const pending: Player[] = [];

    filteredPlayers.forEach((player) => {
      const playerAvailabilities = availabilities[player.id];

      // Pour les hommes : vérifier uniquement masculin
      // Pour les femmes : vérifier masculin ET féminin
      if (player.gender === "M") {
        if (playerAvailabilities?.masculin !== undefined) {
          responded.push(player);
        } else {
          pending.push(player);
        }
      } else {
        // Femmes : doivent avoir répondu aux deux
        if (
          playerAvailabilities?.masculin !== undefined &&
          playerAvailabilities?.feminin !== undefined
        ) {
          responded.push(player);
        } else {
          pending.push(player);
        }
      }
    });

    return {
      respondedPlayers: responded,
      pendingPlayers: pending,
    };
  }, [filteredPlayers, availabilities]);

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

  // Charger les disponibilités existantes pour la journée sélectionnée (masculin ET féminin)
  useEffect(() => {
    if (selectedJournee !== null && selectedPhase !== null) {
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

          // Fusionner les deux types de disponibilités
          const mergedAvailabilities: Record<
            string,
            {
              masculin?: AvailabilityResponse;
              feminin?: AvailabilityResponse;
            }
          > = {};

          // Ajouter les disponibilités masculines
          if (masculineAvailability) {
            Object.entries(masculineAvailability.players).forEach(
              ([playerId, response]) => {
                if (!mergedAvailabilities[playerId]) {
                  mergedAvailabilities[playerId] = {};
                }
                mergedAvailabilities[playerId].masculin = response;
              }
            );
          }

          // Ajouter les disponibilités féminines
          if (feminineAvailability) {
            Object.entries(feminineAvailability.players).forEach(
              ([playerId, response]) => {
                if (!mergedAvailabilities[playerId]) {
                  mergedAvailabilities[playerId] = {};
                }
                mergedAvailabilities[playerId].feminin = response;
              }
            );
          }

          setAvailabilities(mergedAvailabilities);
        } catch (error) {
          console.error("Erreur lors du chargement des disponibilités:", error);
          setAvailabilities({});
        }
      };
      loadAvailability();
    }
  }, [selectedJournee, selectedPhase, availabilityService]);

  const handleAvailabilityChange = (
    playerId: string,
    championshipType: "masculin" | "feminin",
    available: boolean
  ) => {
    if (selectedJournee === null || selectedPhase === null) return;

    setAvailabilities((prev) => {
      const playerAvailabilities = prev[playerId] || {};
      const updatedAvailabilities = {
        ...prev,
        [playerId]: {
          ...playerAvailabilities,
          [championshipType]: {
            ...playerAvailabilities[championshipType],
            available,
          },
        },
      };

      // Sauvegarde automatique pour le type de championnat spécifique
      // Récupérer d'abord les données existantes pour préserver les autres joueurs
      availabilityService
        .getAvailability(selectedJournee, selectedPhase, championshipType)
        .then((existingAvailability) => {
          const playersForChampionship: Record<string, AvailabilityResponse> = {
            ...(existingAvailability?.players || {}),
          };

          // Mettre à jour avec les nouvelles disponibilités
          Object.entries(updatedAvailabilities).forEach(([pid, avail]) => {
            const response = avail[championshipType];
            if (response) {
              playersForChampionship[pid] = response;
            }
          });

          return availabilityService.saveAvailability({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType,
            players: playersForChampionship,
          });
        })
        .catch((error) => {
          console.error("Erreur lors de la sauvegarde automatique:", error);
        });

      return updatedAvailabilities;
    });
  };

  const handleCommentChange = (
    playerId: string,
    championshipType: "masculin" | "feminin",
    comment: string
  ) => {
    if (selectedJournee === null || selectedPhase === null) return;

    // Annuler le timeout précédent pour ce joueur et ce type de championnat
    if (commentSaveTimeoutRef.current[playerId]?.[championshipType]) {
      clearTimeout(commentSaveTimeoutRef.current[playerId][championshipType]!);
    }

    setAvailabilities((prev) => {
      const playerAvailabilities = prev[playerId] || {};
      const existingResponse = playerAvailabilities[championshipType] || {
        available: true,
      };

      return {
        ...prev,
        [playerId]: {
          ...playerAvailabilities,
          [championshipType]: {
            ...existingResponse,
            comment: comment || undefined,
          },
        },
      };
    });

    // Sauvegarde automatique après un délai (debounce)
    if (!commentSaveTimeoutRef.current[playerId]) {
      commentSaveTimeoutRef.current[playerId] = {};
    }

    commentSaveTimeoutRef.current[playerId][championshipType] = setTimeout(
      async () => {
        try {
          // Récupérer d'abord les données existantes pour préserver les autres joueurs
          const existingAvailability =
            await availabilityService.getAvailability(
              selectedJournee,
              selectedPhase,
              championshipType
            );

          const playersForChampionship: Record<string, AvailabilityResponse> = {
            ...(existingAvailability?.players || {}),
          };

          // Mettre à jour avec les nouvelles disponibilités
          Object.entries(availabilitiesRef.current).forEach(([pid, avail]) => {
            const response = avail[championshipType];
            if (response) {
              playersForChampionship[pid] = response;
            }
          });

          await availabilityService.saveAvailability({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType,
            players: playersForChampionship,
          });
        } catch (error) {
          console.error("Erreur lors de la sauvegarde automatique:", error);
        }
        if (commentSaveTimeoutRef.current[playerId]) {
          delete commentSaveTimeoutRef.current[playerId][championshipType];
        }
      },
      1500
    );
  };

  const [tabValue, setTabValue] = useState(0);

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
          <Typography variant="h4" gutterBottom>
            Disponibilités des Joueurs
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Saisissez la disponibilité des joueurs pour une journée de
            championnat. Par défaut, seuls les joueurs participant au
            championnat sont affichés.
          </Typography>

          <Card sx={{ mb: 1 }}>
            <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="phase-select-label">Phase</InputLabel>
                  <Select
                    labelId="phase-select-label"
                    id="phase-select"
                    value={selectedPhase || ""}
                    label="Phase"
                    onChange={(e) => {
                      const phase = e.target.value as "aller" | "retour";
                      setSelectedPhase(phase);
                      setSelectedJournee(null); // Réinitialiser la journée lors du changement de phase
                    }}
                  >
                    <MenuItem value="aller">Phase Aller</MenuItem>
                    <MenuItem value="retour">Phase Retour</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="journee-select-label">Journée</InputLabel>
                  <Select
                    labelId="journee-select-label"
                    id="journee-select"
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
                          // Formater les dates pour l'affichage
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

                <FormControlLabel
                  control={
                    <Switch
                      checked={showAllPlayers}
                      onChange={(e) => setShowAllPlayers(e.target.checked)}
                    />
                  }
                  label="Afficher tous les joueurs"
                />
              </Box>

              {selectedJournee && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Rechercher un joueur..."
                  id="player-search"
                  name="player-search"
                  aria-label="Rechercher un joueur"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mt: 2.5, mb: 0.75 }}
                />
              )}
            </CardContent>
          </Card>

          {selectedJournee === null ? (
            <Alert severity="warning">
              Veuillez sélectionner une journée pour commencer la saisie.
            </Alert>
          ) : (
            <>
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 5,
                  backgroundColor: "background.paper",
                  borderBottom: 1,
                  borderColor: "divider",
                  mb: 2,
                  pt: 1,
                  pb: 1,
                }}
              >
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  sx={{
                    minHeight: 40,
                    "& .MuiTab-root": {
                      minHeight: 38,
                      paddingTop: 0.5,
                      paddingBottom: 0.5,
                    },
                  }}
                >
                  <Tab
                    label={`Tous (${filteredPlayers.length})`}
                    icon={<GroupIcon fontSize="small" />}
                    iconPosition="start"
                  />
                  <Tab
                    label={`Réponses (${respondedPlayers.length})`}
                    icon={<CheckCircle fontSize="small" color="success" />}
                    iconPosition="start"
                  />
                  <Tab
                    label={`En attente (${pendingPlayers.length})`}
                    icon={<HourglassEmpty fontSize="small" color="warning" />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              {tabValue === 0 && (
                <Box>
                  <PlayerList
                    players={filteredPlayers}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                  />
                </Box>
              )}

              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Joueurs ayant répondu
                  </Typography>
                  <PlayerList
                    players={respondedPlayers}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                  />
                </Box>
              )}

              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Joueurs en attente de réponse
                  </Typography>
                  {pendingPlayers.length === 0 ? (
                    <Alert severity="success">
                      Tous les joueurs ont répondu !
                    </Alert>
                  ) : (
                    <PlayerList
                      players={pendingPlayers}
                      availabilities={availabilities}
                      onAvailabilityChange={handleAvailabilityChange}
                      onCommentChange={handleCommentChange}
                    />
                  )}
                </Box>
              )}

              <Box sx={{ mt: 4, textAlign: "center" }}>
                <Button
                  variant="outlined"
                  href="/compositions/defaults"
                  sx={{ px: 3 }}
                >
                  Configurer les compositions par défaut
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
}

interface PlayerListProps {
  players: Player[];
  availabilities: Record<
    string,
    {
      masculin?: AvailabilityResponse;
      feminin?: AvailabilityResponse;
    }
  >;
  onAvailabilityChange: (
    playerId: string,
    championshipType: "masculin" | "feminin",
    available: boolean
  ) => void;
  onCommentChange: (
    playerId: string,
    championshipType: "masculin" | "feminin",
    comment: string
  ) => void;
}

function PlayerList({
  players,
  availabilities,
  onAvailabilityChange,
  onCommentChange,
}: PlayerListProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<{
    id: string;
    type: "masculin" | "feminin" | "both";
  } | null>(null);

  return (
    <Box>
      {players.map((player) => {
        const playerAvailabilities = availabilities[player.id] || {};
        const masculinAvailability = playerAvailabilities.masculin;
        const femininAvailability = playerAvailabilities.feminin;
        const isFemale = player.gender === "F";

        // Pour les hommes : vérifier uniquement masculin
        // Pour les femmes : vérifier masculin ET féminin
        const hasRespondedMasculin = masculinAvailability !== undefined;
        const hasRespondedFeminin = isFemale
          ? femininAvailability !== undefined
          : true; // Les hommes n'ont pas de championnat féminin

        const isExpanded = expandedPlayer?.id === player.id;

        return (
          <Card
            key={player.id}
            sx={{
              mb: 1,
              borderLeft:
                hasRespondedMasculin && (isFemale ? hasRespondedFeminin : true)
                  ? `4px solid ${
                      masculinAvailability?.available ? "#4caf50" : "#f44336"
                    }`
                  : "4px solid transparent",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  flexGrow={1}
                  minWidth={0}
                  sx={{
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                  }}
                >
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.firstName} {player.name}
                  </Typography>
                  <Chip
                    label={player.gender === "M" ? "M" : "F"}
                    size="small"
                    color={player.gender === "M" ? "primary" : "secondary"}
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                  {player.license && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {player.license}
                    </Typography>
                  )}
                </Box>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={1}
                  sx={{ minWidth: { xs: "100%", sm: 280 } }}
                >
                  {/* Disponibilité Masculine */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ minWidth: 80, fontWeight: "medium" }}
                    >
                      Masculin:
                    </Typography>
                    <Button
                      variant={
                        masculinAvailability?.available === true
                          ? "contained"
                          : "outlined"
                      }
                      color="success"
                      size="small"
                      onClick={() =>
                        onAvailabilityChange(player.id, "masculin", true)
                      }
                      sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                    >
                      <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                      Oui
                    </Button>
                    <Button
                      variant={
                        masculinAvailability?.available === false
                          ? "contained"
                          : "outlined"
                      }
                      color="error"
                      size="small"
                      onClick={() =>
                        onAvailabilityChange(player.id, "masculin", false)
                      }
                      sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                    >
                      <Cancel fontSize="small" sx={{ mr: 0.5 }} />
                      Non
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        setExpandedPlayer(
                          isExpanded && expandedPlayer?.type === "masculin"
                            ? null
                            : { id: player.id, type: "masculin" }
                        )
                      }
                      sx={{
                        minWidth: 40,
                        position: masculinAvailability?.comment
                          ? "relative"
                          : undefined,
                        ...(masculinAvailability?.comment
                          ? {
                              "&::after": {
                                content: "''",
                                position: "absolute",
                                top: 4,
                                right: 6,
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: "info.main",
                              },
                            }
                          : {}),
                      }}
                    >
                      💬
                    </Button>
                  </Box>

                  {/* Disponibilité Féminine (uniquement pour les femmes) */}
                  {isFemale && (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ minWidth: 80, fontWeight: "medium" }}
                      >
                        Féminin:
                      </Typography>
                      <Button
                        variant={
                          femininAvailability?.available === true
                            ? "contained"
                            : "outlined"
                        }
                        color="success"
                        size="small"
                        onClick={() =>
                          onAvailabilityChange(player.id, "feminin", true)
                        }
                        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                      >
                        <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                        Oui
                      </Button>
                      <Button
                        variant={
                          femininAvailability?.available === false
                            ? "contained"
                            : "outlined"
                        }
                        color="error"
                        size="small"
                        onClick={() =>
                          onAvailabilityChange(player.id, "feminin", false)
                        }
                        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                      >
                        <Cancel fontSize="small" sx={{ mr: 0.5 }} />
                        Non
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpandedPlayer(
                            isExpanded && expandedPlayer?.type === "feminin"
                              ? null
                              : { id: player.id, type: "feminin" }
                          )
                        }
                        sx={{
                          minWidth: 40,
                          position: femininAvailability?.comment
                            ? "relative"
                            : undefined,
                          ...(femininAvailability?.comment
                            ? {
                                "&::after": {
                                  content: "''",
                                  position: "absolute",
                                  top: 4,
                                  right: 6,
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: "info.main",
                                },
                              }
                            : {}),
                        }}
                      >
                        💬
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Commentaires */}
              {isExpanded && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {/* Commentaire Masculin */}
                  <Box>
                    <Typography
                      id={`comment-label-${player.id}-masculin`}
                      variant="caption"
                      sx={{ mb: 0.5, display: "block" }}
                    >
                      Commentaire Masculin:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Commentaire (optionnel)"
                      id={`comment-${player.id}-masculin`}
                      name={`comment-${player.id}-masculin`}
                      value={masculinAvailability?.comment || ""}
                      onChange={(e) =>
                        onCommentChange(player.id, "masculin", e.target.value)
                      }
                      multiline
                      rows={2}
                      inputProps={{
                        "aria-labelledby": `comment-label-${player.id}-masculin`,
                      }}
                    />
                  </Box>

                  {/* Commentaire Féminin (uniquement pour les femmes) */}
                  {isFemale && (
                    <Box>
                      <Typography
                        id={`comment-label-${player.id}-feminin`}
                        variant="caption"
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        Commentaire Féminin:
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Commentaire (optionnel)"
                        id={`comment-${player.id}-feminin`}
                        name={`comment-${player.id}-feminin`}
                        value={femininAvailability?.comment || ""}
                        onChange={(e) =>
                          onCommentChange(player.id, "feminin", e.target.value)
                        }
                        multiline
                        rows={2}
                        inputProps={{
                          "aria-labelledby": `comment-label-${player.id}-feminin`,
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Afficher les commentaires existants s'il y en a (même si pas expanded) */}
              {(masculinAvailability?.comment ||
                (isFemale && femininAvailability?.comment)) &&
                !isExpanded && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {masculinAvailability?.comment && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        <strong>Masc:</strong> {masculinAvailability.comment}
                      </Typography>
                    )}
                    {isFemale && femininAvailability?.comment && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        <strong>Fém:</strong> {femininAvailability.comment}
                      </Typography>
                    )}
                  </Box>
                )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
