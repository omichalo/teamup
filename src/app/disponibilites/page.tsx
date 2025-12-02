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
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  Snackbar,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Search as SearchIcon,
  Group as GroupIcon,
  Comment as CommentIcon,
  DoneAll,
} from "@mui/icons-material";
import { useAvailabilityRealtime } from "@/hooks/useAvailabilityRealtime";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import {
  AvailabilityService,
  DayAvailability,
} from "@/lib/services/availability-service";
import { CompositionService } from "@/lib/services/composition-service";
import { Player } from "@/types/team-management";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { CompositionSelectors } from "@/components/compositions/CompositionSelectors";
import { useAppData } from "@/hooks/useAppData";
import { useSelection } from "@/hooks/useSelection";

interface AvailabilityResponse {
  available?: boolean;
  comment?: string;
}

import { EpreuveType, getIdEpreuve } from "@/lib/shared/epreuve-utils";
import {
  useChampionshipTypes,
  type ChampionshipType,
} from "@/hooks/useChampionshipTypes";

type PlayerAvailabilityByType = {
  masculin?: AvailabilityResponse;
  feminin?: AvailabilityResponse;
};

type AvailabilityState = Record<string, PlayerAvailabilityByType>;

const sanitizeAvailabilityEntry = (
  entry?: AvailabilityResponse | null
): AvailabilityResponse | undefined => {
  if (!entry) {
    return undefined;
  }

  const sanitized: AvailabilityResponse = {};

  if (typeof entry.available === "boolean") {
    sanitized.available = entry.available;
  }

  if (typeof entry.comment === "string") {
    const trimmed = entry.comment.trim();
    if (trimmed.length > 0) {
      sanitized.comment = trimmed;
    }
  }

  if (sanitized.available === undefined && sanitized.comment === undefined) {
    return undefined;
  }

  return sanitized;
};

const availabilityEntriesEqual = (
  current?: AvailabilityResponse | null,
  next?: AvailabilityResponse | null,
  skipNormalization: boolean = false
): boolean => {
  // Pour les commentaires, on compare les valeurs brutes pour permettre les espaces
  const normalizedCurrent = skipNormalization
    ? current
    : sanitizeAvailabilityEntry(current);
  const normalizedNext = skipNormalization
    ? next
    : sanitizeAvailabilityEntry(next);

  if (!normalizedCurrent && !normalizedNext) {
    return true;
  }
  if (!normalizedCurrent || !normalizedNext) {
    return false;
  }

  return (
    normalizedCurrent.available === normalizedNext.available &&
    normalizedCurrent.comment === normalizedNext.comment
  );
};

const updateAvailabilityState = (
  previousState: AvailabilityState,
  playerId: string,
  championshipType: ChampionshipType,
  computeNextEntry: (
    currentEntry: AvailabilityResponse | undefined
  ) => AvailabilityResponse | undefined,
  skipNormalization: boolean = false
): { nextState: AvailabilityState; changed: boolean } => {
  const currentPlayerState = previousState[playerId];
  const currentEntry = currentPlayerState?.[championshipType];

  const computedEntry = computeNextEntry(currentEntry);

  // Pour les commentaires, on compare les valeurs brutes pour permettre les espaces
  // La normalisation sera faite uniquement lors de la sauvegarde
  const normalizedCurrent = skipNormalization
    ? currentEntry
    : sanitizeAvailabilityEntry(currentEntry);
  const normalizedNext = skipNormalization
    ? computedEntry
    : sanitizeAvailabilityEntry(computedEntry);

  if (
    availabilityEntriesEqual(
      normalizedCurrent,
      normalizedNext,
      skipNormalization
    )
  ) {
    return { nextState: previousState, changed: false };
  }

  const nextState: AvailabilityState = { ...previousState };

  // Si on skip la normalisation, on vérifie si l'entrée est vide différemment
  if (skipNormalization) {
    if (
      !computedEntry ||
      (computedEntry.available === undefined &&
        (!computedEntry.comment || computedEntry.comment.trim().length === 0))
    ) {
      if (!currentPlayerState) {
        return { nextState: previousState, changed: false };
      }

      const nextPlayerState: PlayerAvailabilityByType = {
        ...currentPlayerState,
      };
      delete nextPlayerState[championshipType];

      if (Object.keys(nextPlayerState).length === 0) {
        delete nextState[playerId];
      } else {
        nextState[playerId] = nextPlayerState;
      }

      return { nextState, changed: true };
    }

    // Stocker la valeur brute (avec espaces) pour les commentaires
    const nextPlayerState: PlayerAvailabilityByType = {
      ...(currentPlayerState ?? {}),
      [championshipType]: { ...computedEntry },
    };

    nextState[playerId] = nextPlayerState;

    return { nextState, changed: true };
  }

  // Comportement normal avec normalisation
  if (!normalizedNext) {
    if (!currentPlayerState) {
      return { nextState: previousState, changed: false };
    }

    const nextPlayerState: PlayerAvailabilityByType = {
      ...currentPlayerState,
    };
    delete nextPlayerState[championshipType];

    if (Object.keys(nextPlayerState).length === 0) {
      delete nextState[playerId];
    } else {
      nextState[playerId] = nextPlayerState;
    }

    return { nextState, changed: true };
  }

  const sanitizedEntry: AvailabilityResponse = {
    ...normalizedNext,
  };

  const nextPlayerState: PlayerAvailabilityByType = {
    ...(currentPlayerState ?? {}),
    [championshipType]: sanitizedEntry,
  };

  nextState[playerId] = nextPlayerState;

  return { nextState, changed: true };
};

const buildPlayersPayload = (
  state: AvailabilityState,
  championshipType: ChampionshipType
): Record<string, AvailabilityResponse> => {
  const payload: Record<string, AvailabilityResponse> = {};

  Object.entries(state).forEach(([playerId, playerState]) => {
    const entry = sanitizeAvailabilityEntry(playerState[championshipType]);
    if (entry) {
      payload[playerId] = entry;
    }
  });

  return payload;
};

export default function DisponibilitesPage() {
  const { loadBoth, createEmpty } = useChampionshipTypes();
  // Utiliser les données depuis le store global
  const { equipes, loading: loadingEquipes } = useAppData();
  // Utiliser les sélections depuis le store (synchronisées entre pages)
  const {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
    journeesByPhase,
    isParis,
  } = useSelection({
    equipes,
    loadingEquipes,
    autoInitialize: true,
    showJournee: true,
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  // Structure: { playerId: { masculin?: AvailabilityResponse, feminin?: AvailabilityResponse } }
  const [availabilities, setAvailabilities] = useState<AvailabilityState>({});
  const [searchQuery, setSearchQuery] = useState("");
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

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const availabilityService = useMemo(() => new AvailabilityService(), []);
  const compositionService = useMemo(() => new CompositionService(), []);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(
    null
  );

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

  // Filtrer les joueurs selon les critères
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    // Par défaut, seuls les joueurs participant au championnat sélectionné
    if (!showAllPlayers) {
      if (selectedEpreuve === "championnat_paris") {
        // Pour le championnat de Paris, filtrer par participation.championnatParis
        filtered = filtered.filter(
          (p) => p.participation?.championnatParis === true
        );
      } else {
        // Pour le championnat par équipes, filtrer par participation.championnat
        filtered = filtered.filter(
          (p) => p.participation?.championnat === true
        );
      }
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
  }, [players, showAllPlayers, searchQuery, selectedEpreuve]);

  // Séparer les joueurs ayant répondu et ceux en attente
  const { respondedPlayers, pendingPlayers } = useMemo(() => {
    const responded: Player[] = [];
    const pending: Player[] = [];

    filteredPlayers.forEach((player) => {
      const playerAvailabilities = availabilities[player.id];

      // Pour les hommes : vérifier uniquement masculin
      // Pour les femmes : vérifier masculin ET féminin
      // Un joueur a répondu seulement s'il a indiqué disponible/indisponible (available est un boolean)
      // Un commentaire seul ne compte pas comme une réponse
      if (player.gender === "M") {
        if (typeof playerAvailabilities?.masculin?.available === "boolean") {
          responded.push(player);
        } else {
          pending.push(player);
        }
      } else {
        // Femmes : doivent avoir répondu aux deux (available doit être un boolean pour les deux)
        if (
          typeof playerAvailabilities?.masculin?.available === "boolean" &&
          typeof playerAvailabilities?.feminin?.available === "boolean"
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

  // Fonctions génériques pour filtrer les joueurs selon leur disponibilité
  const filterPlayersByComment = useCallback(
    (
      player: Player,
      playerAvailabilities: PlayerAvailabilityByType | undefined
    ): boolean => {
      const masculinComment = playerAvailabilities?.masculin?.comment?.trim();
      const femininComment = playerAvailabilities?.feminin?.comment?.trim();

      if (player.gender === "M") {
        return Boolean(masculinComment && masculinComment.length > 0);
      } else {
        return Boolean(
          (masculinComment && masculinComment.length > 0) ||
            (femininComment && femininComment.length > 0)
        );
      }
    },
    []
  );

  const filterPlayersByOK = useCallback(
    (
      player: Player,
      playerAvailabilities: PlayerAvailabilityByType | undefined
    ): boolean => {
      if (player.gender === "M") {
        return playerAvailabilities?.masculin?.available === true;
      } else {
        // Pour les femmes : au moins une catégorie avec available === true
        return (
          playerAvailabilities?.masculin?.available === true ||
          playerAvailabilities?.feminin?.available === true
        );
      }
    },
    []
  );

  const filterPlayersByKO = useCallback(
    (
      player: Player,
      playerAvailabilities: PlayerAvailabilityByType | undefined
    ): boolean => {
      if (player.gender === "M") {
        return playerAvailabilities?.masculin?.available === false;
      } else {
        // Pour les femmes : au moins une catégorie avec available === false
        return (
          playerAvailabilities?.masculin?.available === false ||
          playerAvailabilities?.feminin?.available === false
        );
      }
    },
    []
  );

  // Joueurs ayant fait un commentaire (au moins un commentaire présent, même sans réponse)
  const playersWithComment = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      return filterPlayersByComment(player, playerAvailabilities);
    });
  }, [filteredPlayers, availabilities, filterPlayersByComment]);

  // Joueurs ayant répondu OK (disponible) - au moins une catégorie avec available === true
  // Pour les femmes : si elle a répondu OK dans une catégorie, elle apparaît dans OK
  // (même si elle a répondu KO dans l'autre catégorie)
  const playersWithOK = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      return filterPlayersByOK(player, playerAvailabilities);
    });
  }, [filteredPlayers, availabilities, filterPlayersByOK]);

  // Joueurs ayant répondu KO (indisponible) - au moins une catégorie avec available === false
  // Pour les femmes : si elle a répondu KO dans une catégorie, elle apparaît dans KO
  // (même si elle a répondu OK dans l'autre catégorie)
  const playersWithKO = useMemo(() => {
    return filteredPlayers.filter((player) => {
      const playerAvailabilities = availabilities[player.id];
      return filterPlayersByKO(player, playerAvailabilities);
    });
  }, [filteredPlayers, availabilities, filterPlayersByKO]);

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

  // Calculer l'idEpreuve pour les hooks
  const idEpreuveForHooks = useMemo(() => {
    return getIdEpreuve(selectedEpreuve);
  }, [selectedEpreuve]);

  // Écouter les disponibilités en temps réel (masculin)
  const {
    availability: masculineAvailability,
    error: errorMasculineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "masculin",
    idEpreuveForHooks
  );

  // Écouter les disponibilités en temps réel (féminin)
  const {
    availability: feminineAvailability,
    error: errorFeminineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "feminin",
    idEpreuveForHooks
  );

  // Fusionner les disponibilités masculines et féminines en temps réel
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setAvailabilities({});
      return;
    }

    // Fusionner les deux types de disponibilités
    const mergedAvailabilities: AvailabilityState = {};

    // Ajouter les disponibilités masculines
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

    // Ajouter les disponibilités féminines
    if (feminineAvailability) {
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
      assignedPlayersByTypeRef.current = createEmpty(new Set<string>());
      assignedPlayersDetailsRef.current = createEmpty<Record<string, string[]>>(
        {}
      );
      return;
    }

    let isCancelled = false;

    const loadAssignedPlayers = async () => {
      try {
        // Utiliser loadBoth pour charger les compositions en parallèle
        const result = await loadBoth({
          loadMasculin: () =>
            compositionService.getComposition(
              selectedJournee,
              selectedPhase,
              "masculin"
            ),
          loadFeminin: () =>
            compositionService.getComposition(
              selectedJournee,
              selectedPhase,
              "feminin"
            ),
          defaultValue: null,
        });

        if (isCancelled) {
          return;
        }

        const mapping = createEmpty(new Set<string>());
        const details = createEmpty<Record<string, string[]>>({});

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

        processComposition(result.data.masculin, "masculin");
        processComposition(result.data.feminin, "feminin");

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
        assignedPlayersByTypeRef.current = createEmpty(new Set<string>());
        assignedPlayersDetailsRef.current = createEmpty<
          Record<string, string[]>
        >({});
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
    loadBoth,
    createEmpty,
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

    let nextStateSnapshot: AvailabilityState | null = null;
    let stateChanged = false;

    setAvailabilities((prev) => {
      const { nextState, changed } = updateAvailabilityState(
        prev,
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

      if (!changed) {
        return prev;
      }

      nextStateSnapshot = nextState;
      stateChanged = true;
      return nextState;
    });

    if (stateChanged && nextStateSnapshot) {
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

    let nextStateSnapshot: AvailabilityState | null = null;
    let stateChanged = false;

    setAvailabilities((prev) => {
      const { nextState, changed } = updateAvailabilityState(
        prev,
        playerId,
        championshipType,
        (currentEntry) => {
          const nextEntry: AvailabilityResponse = {};

          if (typeof currentEntry?.available === "boolean") {
            nextEntry.available = currentEntry.available;
          }

          // Stocker la valeur brute (avec espaces) pour permettre la saisie
          // Le trim sera fait uniquement lors de la sauvegarde dans sanitizeAvailabilityEntry
          if (comment.length > 0) {
            nextEntry.comment = comment;
          } else {
            // Si le commentaire est vide, ne pas l'inclure dans l'entrée
            // Cela permet de supprimer le commentaire si l'utilisateur efface tout
          }

          return nextEntry;
        },
        true // Skip la normalisation pour permettre les espaces dans les commentaires
      );

      if (!changed) {
        return prev;
      }

      nextStateSnapshot = nextState;
      stateChanged = true;
      return nextState;
    });

    if (!stateChanged || !nextStateSnapshot) {
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

        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <CompositionSelectors
                selectedEpreuve={selectedEpreuve}
                selectedPhase={selectedPhase}
                selectedJournee={selectedJournee}
                onEpreuveChange={(epreuve) => {
                  setSelectedEpreuve(epreuve);
                  setSelectedPhase(null); // Réinitialiser la phase lors du changement d'épreuve
                  setSelectedJournee(null); // Réinitialiser la journée lors du changement d'épreuve
                }}
                onPhaseChange={(phase) => {
                  setSelectedPhase(phase);
                  setSelectedJournee(null); // Réinitialiser la journée lors du changement de phase
                }}
                onJourneeChange={setSelectedJournee}
                isParis={isParis}
                journeesByPhase={journeesByPhase}
                showJournee={true}
              />

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
                  icon={<DoneAll fontSize="small" color="primary" />}
                  iconPosition="start"
                />
                <Tab
                  label={`En attente (${pendingPlayers.length})`}
                  icon={<HourglassEmpty fontSize="small" color="warning" />}
                  iconPosition="start"
                />
                <Tab
                  label={`Commentaires (${playersWithComment.length})`}
                  icon={<CommentIcon fontSize="small" color="info" />}
                  iconPosition="start"
                />
                <Tab
                  label={`OK (${playersWithOK.length})`}
                  icon={<CheckCircle fontSize="small" color="success" />}
                  iconPosition="start"
                />
                <Tab
                  label={`KO (${playersWithKO.length})`}
                  icon={<Cancel fontSize="small" color="error" />}
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
                  selectedEpreuve={selectedEpreuve}
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
                  <PlayerList
                    players={pendingPlayers}
                    availabilities={availabilities}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                    selectedEpreuve={selectedEpreuve}
                  />
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
                  <PlayerList
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
                  <PlayerList
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
                  <PlayerList
                    players={playersWithKO}
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
  selectedEpreuve?: EpreuveType | null;
}

function PlayerList({
  players,
  availabilities,
  onAvailabilityChange,
  onCommentChange,
  selectedEpreuve,
}: PlayerListProps) {
  const { isParisChampionship } = useChampionshipTypes();
  const isParis = isParisChampionship(selectedEpreuve);
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

        // Pour le championnat de Paris : vérifier uniquement masculin (pas de distinction)
        // Pour le championnat par équipes :
        //   - Pour les hommes : vérifier uniquement masculin
        //   - Pour les femmes : vérifier masculin ET féminin
        // Un joueur a répondu seulement s'il a indiqué disponible/indisponible (available est un boolean)
        const hasRespondedMasculin =
          typeof masculinAvailability?.available === "boolean";
        const hasRespondedFeminin = isParis
          ? true // Pour Paris, pas de distinction
          : isFemale
          ? typeof femininAvailability?.available === "boolean"
          : true; // Les hommes n'ont pas de championnat féminin

        const isExpanded = expandedPlayer?.id === player.id;

        return (
          <Card
            key={player.id}
            sx={{
              mb: 1,
              borderLeft: isParis
                ? hasRespondedMasculin
                  ? `4px solid ${
                      masculinAvailability?.available ? "#4caf50" : "#f44336"
                    }`
                  : "4px solid transparent"
                : hasRespondedMasculin &&
                  (isFemale ? hasRespondedFeminin : true)
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
                  {/* Disponibilité - Pour le championnat de Paris, pas de distinction masculin/féminin */}
                  {isParis ? (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ flexWrap: "wrap" }}
                    >
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
                  ) : (
                    <>
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
                    </>
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
                  {isParis ? (
                    <Box>
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
                      />
                    </Box>
                  ) : (
                    <>
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
                            onCommentChange(
                              player.id,
                              "masculin",
                              e.target.value
                            )
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
                              onCommentChange(
                                player.id,
                                "feminin",
                                e.target.value
                              )
                            }
                            multiline
                            rows={2}
                            inputProps={{
                              "aria-labelledby": `comment-label-${player.id}-feminin`,
                            }}
                          />
                        </Box>
                      )}
                    </>
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
                    {isParis ? (
                      masculinAvailability?.comment && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          {masculinAvailability.comment}
                        </Typography>
                      )
                    ) : (
                      <>
                        {masculinAvailability?.comment && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            <strong>Masc:</strong>{" "}
                            {masculinAvailability.comment}
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
                      </>
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
