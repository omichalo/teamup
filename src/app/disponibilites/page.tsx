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
  Chip,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  LinkOff as LinkOffIcon,
} from "@mui/icons-material";
import { useTeamData } from "@/hooks/useTeamData";
import { useAvailabilities } from "@/hooks/useAvailabilities";
import { usePlayers } from "@/hooks/usePlayers";
import {
  AvailabilityService,
  DayAvailability,
} from "@/lib/services/availability-service";
import { CompositionService } from "@/lib/services/composition-service";
import { Player } from "@/types/team-management";
import { ChampionshipType } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import {
  AvailabilityState,
  sanitizeAvailabilityEntry,
  buildPlayersPayload,
} from "@/lib/availability/utils";
import { useAvailabilityStore } from "@/stores/availabilityStore";
import { usePhasePreselect } from "@/hooks/usePhasePreselect";
import { DisponibilitesAvailabilityTabs } from "@/components/disponibilites/DisponibilitesAvailabilityTabs";
import { DisponibilitesFiltersCard } from "@/components/disponibilites/DisponibilitesFiltersCard";
import { PlayerAvailabilityList } from "@/components/disponibilites/PlayerAvailabilityList";
import { DiscordPollManager } from "@/components/disponibilites/DiscordPollManager";
import { getDiscordPollDates } from "@/lib/availability/discord-poll-dates";

import { getIdEpreuve } from "@/lib/shared/epreuve-utils";
import { useJourneesData } from "@/hooks/useJourneesData";

export default function DisponibilitesPage() {
  const { equipes, loading: loadingEquipes, currentPhase } = useTeamData();
  const {
    selectedEpreuve,
    selectedJournee,
    selectedPhase,
    showAllPlayers,
    searchQuery,
    availabilities,
    setSelectedEpreuve,
    setSelectedJournee,
    setSelectedPhase,
    setShowAllPlayers,
    setSearchQuery,
    setAvailabilities,
    updateAvailabilityEntry,
  } = useAvailabilityStore();
  const { players, loading: loadingPlayers } = usePlayers();
  const commentSaveTimeoutRef = React.useRef<
    Record<string, { masculin?: NodeJS.Timeout; feminin?: NodeJS.Timeout }>
  >({});
  const availabilitiesRef = React.useRef<AvailabilityState>({});
  const assignedPlayersByTypeRef = React.useRef<{
    masculin: Set<string>;
    feminin: Set<string>;
  }>({ masculin: new Set(), feminin: new Set() });
  const assignedPlayersDetailsRef = React.useRef<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>({ masculin: {}, feminin: {} });

  const availabilityService = useMemo(() => new AvailabilityService(), []);
  const compositionService = useMemo(() => new CompositionService(), []);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(
    null
  );
  type PendingDiscordFilter = "all" | "with_discord" | "without_discord";
  const [pendingDiscordFilter, setPendingDiscordFilter] =
    useState<PendingDiscordFilter>("all");

  const handleWarningClose = useCallback(() => {
    setAvailabilityWarning(null);
  }, []);

  const persistAvailability = useCallback(
    async (
      stateSnapshot: AvailabilityState,
      championshipType: ChampionshipType
    ) => {
      if (
        selectedJournee === null ||
        selectedPhase === null ||
        selectedEpreuve === null
      ) {
        return;
      }

      const payload = buildPlayersPayload(stateSnapshot, championshipType);
      const idEpreuve = getIdEpreuve(selectedEpreuve);

      console.log("[Disponibilites] Persist availability", {
        journee: selectedJournee,
        phase: selectedPhase,
        championshipType,
        idEpreuve,
        payload,
      });

      try {
        const availabilityData: DayAvailability = {
          journee: selectedJournee,
          phase: selectedPhase,
          championshipType,
          players: payload,
        };

        if (idEpreuve !== undefined) {
          availabilityData.idEpreuve = idEpreuve;
        }

        await availabilityService.saveAvailability(availabilityData);
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde de la disponibilité:",
          error
        );
      }
    },
    [availabilityService, selectedJournee, selectedPhase, selectedEpreuve]
  );

  // Mettre à jour la ref quand availabilities change
  useEffect(() => {
    availabilitiesRef.current = availabilities;
  }, [availabilities]);

  const {
    journeesByPhase,
    defaultEpreuve,
    hasDataForEpreuve,
  } = useJourneesData(equipes, selectedEpreuve, selectedPhase);

  // Initialiser selectedEpreuve avec l'épreuve par défaut
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

  // Initialiser selectedJournee avec la prochaine journée dans le futur (basée sur la date de début)
  useEffect(() => {
    // Pour le championnat de Paris, utiliser "aller" comme phase par défaut
    const phaseToUse =
      selectedEpreuve === "championnat_paris" ? "aller" : selectedPhase;

    if (
      selectedEpreuve === null ||
      phaseToUse === null ||
      !journeesByPhase.has(phaseToUse)
    ) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer uniquement les dates

    const journees = Array.from(
      journeesByPhase.get(phaseToUse)?.values() || []
    ) as Array<{ journee: number; phase: "aller" | "retour"; dates: Date[] }>;

    // Trouver la prochaine journée basée sur la date de début (minimum)
    const nextJournee = journees
      .sort((a, b) => a.journee - b.journee) // Trier par numéro de journée
      .find(({ dates }) => {
        if (dates.length === 0) return false;
        // La date de début de la journée = date minimale
        const debutJournee = new Date(
          Math.min(...dates.map((d: Date) => d.getTime()))
        );
        debutJournee.setHours(0, 0, 0, 0);
        return debutJournee >= now;
      });

    if (nextJournee) {
      setSelectedJournee(nextJournee.journee);
    } else if (journees.length > 0) {
      // Si aucune journée future, sélectionner la dernière
      const lastJournee = journees.sort((a, b) => b.journee - a.journee)[0];
      setSelectedJournee(lastJournee.journee);
    }
  }, [journeesByPhase, selectedEpreuve, selectedPhase, setSelectedJournee]);

  // Filtrer les joueurs selon les critères
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    // Par défaut, seuls les joueurs participant au championnat sélectionné
    // MAIS on inclut aussi les joueurs non inscrits qui ont répondu au sondage
    if (!showAllPlayers) {
      if (selectedEpreuve === "championnat_paris") {
        // Pour le championnat de Paris, filtrer par participation.championnatParis
        // OU joueurs ayant répondu au sondage (availabilities.masculin.available défini)
        filtered = filtered.filter((p) => {
          const isRegistered = p.participation?.championnatParis === true;
          const hasResponded = typeof availabilities[p.id]?.masculin?.available === "boolean";
          return isRegistered || hasResponded;
        });
      } else {
        // Pour le championnat par équipes, filtrer par participation.championnat
        // OU joueurs ayant répondu au sondage (masculin ou féminin)
        filtered = filtered.filter((p) => {
          const isRegistered = p.participation?.championnat === true;
          const hasRespondedMasculin = typeof availabilities[p.id]?.masculin?.available === "boolean";
          const hasRespondedFeminin = typeof availabilities[p.id]?.feminin?.available === "boolean";
          return isRegistered || hasRespondedMasculin || hasRespondedFeminin;
        });
      }
    }

    // Afficher tous les joueurs (hommes et femmes) sans distinction

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
  }, [players, showAllPlayers, searchQuery, selectedEpreuve, availabilities]);

  // Séparer les joueurs ayant répondu et ceux en attente
  // Pour le championnat de Paris : un seul sondage, tous répondent une seule fois (masculin)
  // Pour le championnat par équipes : les hommes répondent masculin, les femmes peuvent répondre masculin ET féminin
  const isParisChampionshipForResponse =
    selectedEpreuve === "championnat_paris";
  const { respondedPlayers, pendingPlayers } = useMemo(() => {
    const responded: Player[] = [];
    const pending: Player[] = [];

    filteredPlayers.forEach((player) => {
      const playerAvailabilities = availabilities[player.id];
      const isFemale = player.gender === "F";

      if (isParisChampionshipForResponse) {
        // Championnat de Paris : un seul sondage, tous répondent une seule fois
        if (typeof playerAvailabilities?.masculin?.available === "boolean") {
          responded.push(player);
        } else {
          pending.push(player);
        }
      } else {
        // Championnat par équipes :
        // - Les hommes répondent uniquement masculin
        // - Les femmes doivent répondre masculin ET féminin
        if (isFemale) {
          if (
            typeof playerAvailabilities?.masculin?.available === "boolean" &&
            typeof playerAvailabilities?.feminin?.available === "boolean"
          ) {
            responded.push(player);
          } else {
            pending.push(player);
          }
        } else {
          if (typeof playerAvailabilities?.masculin?.available === "boolean") {
            responded.push(player);
          } else {
            pending.push(player);
          }
        }
      }
    });

    return {
      respondedPlayers: responded,
      pendingPlayers: pending,
    };
  }, [filteredPlayers, availabilities, isParisChampionshipForResponse]);

  // Joueurs ayant fait un commentaire (au moins un commentaire présent, même sans réponse)
  const playersWithComment = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      const masculinComment = playerAvailabilities?.masculin?.comment?.trim();
      const femininComment = playerAvailabilities?.feminin?.comment?.trim();
      const isFemale = player.gender === "F";

      if (isParisChampionshipForResponse) {
        return masculinComment && masculinComment.length > 0;
      } else {
        // Championnat par équipes : pour les femmes, vérifier les deux commentaires
        if (isFemale) {
          return (
            (masculinComment && masculinComment.length > 0) ||
            (femininComment && femininComment.length > 0)
          );
        } else {
          return masculinComment && masculinComment.length > 0;
        }
      }
    });
  }, [filteredPlayers, availabilities, isParisChampionshipForResponse]);

  // En attente : distinguer ceux avec / sans compte Discord
  const pendingWithDiscord = useMemo(() => {
    return pendingPlayers.filter((p) => !!p.discordMentions?.length);
  }, [pendingPlayers]);
  const pendingWithoutDiscord = useMemo(() => {
    return pendingPlayers.filter((p) => !p.discordMentions?.length);
  }, [pendingPlayers]);

  // Tous les joueurs non associés à un compte Discord (filtre global)
  const playersWithoutDiscord = useMemo(() => {
    return filteredPlayers.filter((p) => !p.discordMentions?.length);
  }, [filteredPlayers]);

  // Joueurs ayant répondu OK (disponible)
  const playersWithOK = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      const isFemale = player.gender === "F";

      if (isParisChampionshipForResponse) {
        return playerAvailabilities?.masculin?.available === true;
      } else {
        // Championnat par équipes : pour les femmes, au moins une catégorie avec OK
        if (isFemale) {
          return (
            playerAvailabilities?.masculin?.available === true ||
            playerAvailabilities?.feminin?.available === true
          );
        } else {
          return playerAvailabilities?.masculin?.available === true;
        }
      }
    });
  }, [filteredPlayers, availabilities, isParisChampionshipForResponse]);

  // Joueurs ayant répondu KO (indisponible)
  const playersWithKO = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      const isFemale = player.gender === "F";

      if (isParisChampionshipForResponse) {
        return playerAvailabilities?.masculin?.available === false;
      } else {
        // Championnat par équipes : pour les femmes, au moins une catégorie avec KO
        if (isFemale) {
          return (
            playerAvailabilities?.masculin?.available === false ||
            playerAvailabilities?.feminin?.available === false
          );
        } else {
          return playerAvailabilities?.masculin?.available === false;
        }
      }
    });
  }, [filteredPlayers, availabilities, isParisChampionshipForResponse]);

  // Calculer l'idEpreuve pour les hooks
  const idEpreuveForHooks = useMemo(() => {
    return getIdEpreuve(selectedEpreuve);
  }, [selectedEpreuve]);

  // Écouter les disponibilités en temps réel
  // Pour le championnat de Paris : uniquement masculin (un seul sondage)
  // Pour le championnat par équipes : masculin ET féminin (deux sondages possibles)
  const isParisChampionship = selectedEpreuve === "championnat_paris";

  const {
    availability: masculineAvailability,
    error: errorMasculineAvailability,
  } = useAvailabilities({
    journee: selectedJournee,
    phase: selectedPhase,
    championshipType: "masculin",
    ...(idEpreuveForHooks !== undefined
      ? { idEpreuve: idEpreuveForHooks }
      : {}),
  });

  const {
    availability: feminineAvailability,
    error: errorFeminineAvailability,
  } = useAvailabilities({
    journee: selectedJournee,
    phase: selectedPhase,
    championshipType: "feminin",
    ...(idEpreuveForHooks !== undefined
      ? { idEpreuve: idEpreuveForHooks }
      : {}),
  });

  // Fusionner les disponibilités masculines et féminines en temps réel
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setAvailabilities({});
      return;
    }

    const mergedAvailabilities: AvailabilityState = {};

    // Ajouter les disponibilités masculines (toujours présentes)
    if (masculineAvailability) {
      Object.entries(masculineAvailability.players).forEach(
        ([playerId, response]) => {
          const sanitized = sanitizeAvailabilityEntry(response);
          if (!sanitized) {
            return;
          }
          if (!mergedAvailabilities[playerId]) {
            mergedAvailabilities[playerId] = {};
          }
          mergedAvailabilities[playerId].masculin = sanitized;
        }
      );
    }

    // Ajouter les disponibilités féminines (uniquement pour le championnat par équipes)
    if (!isParisChampionship && feminineAvailability) {
      Object.entries(feminineAvailability.players).forEach(
        ([playerId, response]) => {
          const sanitized = sanitizeAvailabilityEntry(response);
          if (!sanitized) {
            return;
          }
          if (!mergedAvailabilities[playerId]) {
            mergedAvailabilities[playerId] = {};
          }
          mergedAvailabilities[playerId].feminin = sanitized;
        }
      );
    }

    setAvailabilities(mergedAvailabilities);
  }, [
    masculineAvailability,
    feminineAvailability,
    selectedJournee,
    selectedPhase,
    isParisChampionship,
    setAvailabilities,
  ]);

  // Gérer les erreurs de chargement
  useEffect(() => {
    if (errorMasculineAvailability || errorFeminineAvailability) {
      console.error(
        "Erreur lors de l'écoute des disponibilités:",
        errorMasculineAvailability || errorFeminineAvailability
      );
    }
  }, [errorMasculineAvailability, errorFeminineAvailability]);

  useEffect(() => {
    if (
      selectedJournee === null ||
      selectedPhase === null ||
      loadingEquipes ||
      loadingPlayers
    ) {
      assignedPlayersByTypeRef.current = {
        masculin: new Set(),
        feminin: new Set(),
      };
      assignedPlayersDetailsRef.current = { masculin: {}, feminin: {} };
      return;
    }

    let isCancelled = false;

    const loadAssignedPlayers = async () => {
      try {
        const [masculineComposition, feminineComposition] = await Promise.all([
          compositionService.getComposition(
            selectedJournee,
            selectedPhase,
            "masculin"
          ),
          compositionService.getComposition(
            selectedJournee,
            selectedPhase,
            "feminin"
          ),
        ]);

        if (isCancelled) {
          return;
        }

        const mapping = {
          masculin: new Set<string>(),
          feminin: new Set<string>(),
        };
        const details: {
          masculin: Record<string, string[]>;
          feminin: Record<string, string[]>;
        } = { masculin: {}, feminin: {} };

        const processComposition = (
          composition: Awaited<
            ReturnType<typeof compositionService.getComposition>
          > | null,
          type: ChampionshipType
        ) => {
          if (!composition?.teams) {
            return;
          }
          Object.entries(composition.teams).forEach(([teamId, playerIds]) => {
            const teamName =
              equipes.find((eq) => eq.team.id === teamId)?.team.name || teamId;
            playerIds.forEach((playerId) => {
              if (!playerId) {
                return;
              }
              mapping[type].add(playerId);
              if (!details[type][playerId]) {
                details[type][playerId] = [];
              }
              if (!details[type][playerId].includes(teamName)) {
                details[type][playerId].push(teamName);
              }
            });
          });
        };

        processComposition(masculineComposition, "masculin");
        processComposition(feminineComposition, "feminin");

        assignedPlayersByTypeRef.current = mapping;
        assignedPlayersDetailsRef.current = details;
      } catch (error) {
        if (isCancelled) {
          return;
        }
        console.error(
          "Erreur lors du chargement des compositions pour la page disponibilités:",
          error
        );
        assignedPlayersByTypeRef.current = {
          masculin: new Set(),
          feminin: new Set(),
        };
        assignedPlayersDetailsRef.current = { masculin: {}, feminin: {} };
      }
    };

    loadAssignedPlayers();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedJournee,
    selectedPhase,
    compositionService,
    equipes,
    loadingEquipes,
    loadingPlayers,
  ]);

  const handleAvailabilityChange = (
    playerId: string,
    championshipType: ChampionshipType,
    available: boolean
  ) => {
    if (selectedJournee === null || selectedPhase === null) return;

    if (commentSaveTimeoutRef.current[playerId]?.[championshipType]) {
      clearTimeout(commentSaveTimeoutRef.current[playerId][championshipType]!);
      delete commentSaveTimeoutRef.current[playerId][championshipType];
    }

    const nextStateSnapshot = updateAvailabilityEntry(
      playerId,
      championshipType,
      (currentEntry) => {
        if (currentEntry?.available === available) {
          const nextEntry: AvailabilityResponse = {};
          if (
            typeof currentEntry?.comment === "string" &&
            currentEntry.comment.trim().length > 0
          ) {
            nextEntry.comment = currentEntry.comment;
          }
          return nextEntry;
        }

        const nextEntry: AvailabilityResponse = {
          available,
        };

        if (
          typeof currentEntry?.comment === "string" &&
          currentEntry.comment.trim().length > 0
        ) {
          nextEntry.comment = currentEntry.comment;
        }

        return nextEntry;
      }
    );

    if (nextStateSnapshot) {
      void persistAvailability(nextStateSnapshot, championshipType);

      const resultingEntry = nextStateSnapshot[playerId]?.[championshipType] as
        | AvailabilityResponse
        | undefined;
      const isNowAvailable = resultingEntry?.available === true;
      const isPlayerAssigned =
        assignedPlayersByTypeRef.current[championshipType]?.has(playerId) ??
        false;

      if (isPlayerAssigned && !isNowAvailable) {
        const playerInfo = players.find((p) => p.id === playerId);
        const playerLabel = playerInfo
          ? `${playerInfo.firstName} ${playerInfo.name}`
          : playerId;
        const assignedTeams =
          assignedPlayersDetailsRef.current[championshipType]?.[playerId] || [];
        const teamsLabel =
          assignedTeams.length > 0 ? ` (${assignedTeams.join(", ")})` : "";

        const warningText = `${playerLabel} est actuellement positionné dans une composition${teamsLabel}. Cette équipe sera invalide tant que la disponibilité n'est pas réajustée.`;
        setAvailabilityWarning(warningText);
        console.warn(
          `[Disponibilites] Attention: ${playerLabel} est positionné dans une composition de journée${teamsLabel} mais vient d'être marqué indisponible pour ${championshipType}.`
        );
      }
    }
  };

  const handleCommentChange = (
    playerId: string,
    championshipType: ChampionshipType,
    comment: string
  ) => {
    if (selectedJournee === null || selectedPhase === null) return;

    if (commentSaveTimeoutRef.current[playerId]?.[championshipType]) {
      clearTimeout(commentSaveTimeoutRef.current[playerId][championshipType]!);
    }

    // Stocker la valeur brute pour permettre la saisie d'espaces
    // Le trim sera fait uniquement lors de la sauvegarde

    const nextStateSnapshot = updateAvailabilityEntry(
      playerId,
      championshipType,
      (currentEntry) => {
        const nextEntry: AvailabilityResponse = {};

        if (typeof currentEntry?.available === "boolean") {
          nextEntry.available = currentEntry.available;
        }

        if (comment.length > 0) {
          nextEntry.comment = comment;
        }

        return nextEntry;
      },
      { skipNormalization: true }
    );

    if (!nextStateSnapshot) {
      return;
    }

    if (!commentSaveTimeoutRef.current[playerId]) {
      commentSaveTimeoutRef.current[playerId] = {};
    }

    commentSaveTimeoutRef.current[playerId][championshipType] = setTimeout(
      async () => {
        try {
          const snapshot = availabilitiesRef.current;
          await persistAvailability(snapshot, championshipType);
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
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
      redirectWhenUnauthorized="/joueur"
    >
      <Box sx={{ p: 5 }}>
        <Snackbar
          open={Boolean(availabilityWarning)}
          autoHideDuration={6000}
          onClose={handleWarningClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleWarningClose}
            severity="warning"
            sx={{ width: "100%" }}
          >
            {availabilityWarning}
          </Alert>
        </Snackbar>
        <Typography variant="h4" gutterBottom>
          Disponibilités des Joueurs
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Saisissez la disponibilité des joueurs pour une journée de
          championnat. Par défaut, seuls les joueurs participant au championnat
          sont affichés.
        </Typography>

        <DisponibilitesFiltersCard
          selectedEpreuve={selectedEpreuve}
          selectedPhase={selectedPhase}
          selectedJournee={selectedJournee}
          showAllPlayers={showAllPlayers}
          searchQuery={searchQuery}
          journeesByPhase={journeesByPhase}
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
          onShowAllPlayersChange={setShowAllPlayers}
          onSearchQueryChange={setSearchQuery}
        />

        {selectedJournee !== null && selectedPhase !== null && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              {/* Un seul sondage pour tous les types de championnats */}
              {/* Pour le championnat par équipes, le sondage contiendra les boutons masculin et féminin */}
              <DiscordPollManager
                journee={selectedJournee}
                phase={selectedPhase}
                championshipType="masculin"
                {...(selectedEpreuve &&
                getIdEpreuve(selectedEpreuve) !== undefined
                  ? { idEpreuve: getIdEpreuve(selectedEpreuve) as number }
                  : {})}
                epreuveType={selectedEpreuve}
                {...getDiscordPollDates({
                  selectedEpreuve,
                  selectedPhase,
                  selectedJournee,
                  journeesByPhase,
                })}
              />
            </CardContent>
          </Card>
        )}

        {selectedJournee === null ? (
          <Alert severity="warning">
            Veuillez sélectionner une journée pour commencer la saisie.
          </Alert>
        ) : (
          <>
            <DisponibilitesAvailabilityTabs
              tabValue={tabValue}
              onTabChange={setTabValue}
              counts={{
                all: filteredPlayers.length,
                responded: respondedPlayers.length,
                pending: pendingPlayers.length,
                comments: playersWithComment.length,
                ok: playersWithOK.length,
                ko: playersWithKO.length,
                withoutDiscord: playersWithoutDiscord.length,
              }}
            />

            {tabValue === 0 && (
              <Box>
                <PlayerAvailabilityList
                  players={filteredPlayers}
                  availabilities={availabilities}
                  onAvailabilityChange={handleAvailabilityChange}
                  onCommentChange={handleCommentChange}
                  selectedEpreuve={selectedEpreuve}
                />
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Joueurs ayant répondu
                </Typography>
                <PlayerAvailabilityList
                  players={respondedPlayers}
                  availabilities={availabilities}
                  onAvailabilityChange={handleAvailabilityChange}
                  onCommentChange={handleCommentChange}
                  selectedEpreuve={selectedEpreuve}
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
                  <>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                      <Chip
                        label={`Tous (${pendingPlayers.length})`}
                        onClick={() => setPendingDiscordFilter("all")}
                        color={pendingDiscordFilter === "all" ? "primary" : "default"}
                        variant={pendingDiscordFilter === "all" ? "filled" : "outlined"}
                        size="small"
                      />
                      <Chip
                        label={`Avec Discord (${pendingWithDiscord.length})`}
                        onClick={() => setPendingDiscordFilter("with_discord")}
                        color={pendingDiscordFilter === "with_discord" ? "primary" : "default"}
                        variant={pendingDiscordFilter === "with_discord" ? "filled" : "outlined"}
                        size="small"
                      />
                      <Chip
                        icon={<LinkOffIcon sx={{ fontSize: 16 }} />}
                        label={`Sans Discord (${pendingWithoutDiscord.length})`}
                        onClick={() => setPendingDiscordFilter("without_discord")}
                        color={pendingDiscordFilter === "without_discord" ? "primary" : "default"}
                        variant={pendingDiscordFilter === "without_discord" ? "filled" : "outlined"}
                        size="small"
                      />
                    </Box>
                    <PlayerAvailabilityList
                      players={
                        pendingDiscordFilter === "with_discord"
                          ? pendingWithDiscord
                          : pendingDiscordFilter === "without_discord"
                            ? pendingWithoutDiscord
                            : pendingPlayers
                      }
                      availabilities={availabilities}
                      onAvailabilityChange={handleAvailabilityChange}
                      onCommentChange={handleCommentChange}
                      selectedEpreuve={selectedEpreuve}
                    />
                  </>
                )}
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Joueurs ayant fait un commentaire
                </Typography>
                {playersWithComment.length === 0 ? (
                  <Alert severity="info">
                    Aucun joueur n&apos;a fait de commentaire.
                  </Alert>
                ) : (
                  <PlayerAvailabilityList
                    players={playersWithComment}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                    selectedEpreuve={selectedEpreuve}
                  />
                )}
              </Box>
            )}

            {tabValue === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Joueurs ayant répondu OK (Disponible)
                </Typography>
                {playersWithOK.length === 0 ? (
                  <Alert severity="info">
                    Aucun joueur n&apos;a répondu disponible.
                  </Alert>
                ) : (
                  <PlayerAvailabilityList
                    players={playersWithOK}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                    selectedEpreuve={selectedEpreuve}
                  />
                )}
              </Box>
            )}

            {tabValue === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Joueurs ayant répondu KO (Indisponible)
                </Typography>
                {playersWithKO.length === 0 ? (
                  <Alert severity="info">
                    Aucun joueur n&apos;a répondu indisponible.
                  </Alert>
                ) : (
                  <PlayerAvailabilityList
                    players={playersWithKO}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                    selectedEpreuve={selectedEpreuve}
                  />
                )}
              </Box>
            )}

            {tabValue === 6 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Joueurs non associés à un compte Discord
                </Typography>
                {playersWithoutDiscord.length === 0 ? (
                  <Alert severity="success">
                    Tous les joueurs sont associés à un compte Discord.
                  </Alert>
                ) : (
                  <PlayerAvailabilityList
                    players={playersWithoutDiscord}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                    selectedEpreuve={selectedEpreuve}
                  />
                )}
              </Box>
            )}

            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Button
                variant="outlined"
                href={
                  selectedJournee !== null && selectedPhase !== null
                    ? `/compositions?journee=${selectedJournee}&phase=${selectedPhase}`
                    : "/compositions"
                }
                sx={{ px: 3 }}
              >
                {selectedJournee !== null && selectedPhase !== null
                  ? `Voir les compositions - J${selectedJournee} (${selectedPhase})`
                  : "Voir les compositions"}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </AuthGuard>
  );
}

