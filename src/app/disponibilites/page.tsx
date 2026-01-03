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
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Group as GroupIcon,
  Comment as CommentIcon,
  DoneAll,
  Accessible as AccessibleIcon,
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
import { getTeamsByType } from "@/lib/compositions/championship-utils";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import {
  AvailabilityState,
  sanitizeAvailabilityEntry,
  buildPlayersPayload,
} from "@/lib/availability/utils";
import { useAvailabilityStore } from "@/stores/availabilityStore";
import { EpreuveSelect } from "@/components/compositions/Filters/EpreuveSelect";
import { PhaseSelect } from "@/components/compositions/Filters/PhaseSelect";
import { SearchInput } from "@/components/compositions/Filters/SearchInput";
import { AvailabilityStatusChip } from "@/components/disponibilites/AvailabilityStatusChip";
import { DiscordPollManager } from "@/components/disponibilites/DiscordPollManager";

import {
  EpreuveType,
  getIdEpreuve,
  getMatchEpreuve,
} from "@/lib/shared/epreuve-utils";

export default function DisponibilitesPage() {
  const { equipes, loading: loadingEquipes, currentPhase } = useTeamData();
  const equipesByType = useMemo(() => getTeamsByType(equipes), [equipes]);
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

  // Extraire les journées depuis les matchs, groupées par épreuve et phase avec leurs dates
  const journeesByEpreuveAndPhase = useMemo(() => {
    const journeesMap = new Map<
      EpreuveType,
      Map<
        "aller" | "retour",
        Map<
          number,
          { journee: number; phase: "aller" | "retour"; dates: Date[] }
        >
      >
    >();

    // Debug: log pour voir toutes les équipes et leurs matchs
    const parisEquipes = equipes.filter(
      (equipe) =>
        equipe.team?.idEpreuve === 15980 ||
        equipe.team?.epreuve?.toLowerCase().includes("paris idf") ||
        equipe.team?.epreuve?.toLowerCase().includes("excellence")
    );
    console.log("[Disponibilites] Équipes Paris trouvées:", {
      count: parisEquipes.length,
      equipes: parisEquipes.map((equipe) => ({
        teamId: equipe.team?.id,
        teamName: equipe.team?.name,
        teamIdEpreuve: equipe.team?.idEpreuve,
        teamEpreuve: equipe.team?.epreuve,
        matchesCount: equipe.matches.length,
        matches: equipe.matches.map((match) => ({
          id: match.id,
          idEpreuve: match.idEpreuve,
          journee: match.journee,
          phase: match.phase,
        })),
      })),
    });

    const equipesForJournees = [
      ...equipesByType.masculin,
      ...equipesByType.feminin,
    ];

    equipesForJournees.forEach((equipe) => {
      equipe.matches.forEach((match) => {
        const epreuve = getMatchEpreuve(match, equipe.team);

        // Debug: log pour comprendre pourquoi les matchs de Paris ne sont pas détectés
        if (match.idEpreuve === 15980 || equipe.team?.idEpreuve === 15980) {
          console.log("[Disponibilites] Match Paris détecté:", {
            matchIdEpreuve: match.idEpreuve,
            teamIdEpreuve: equipe.team?.idEpreuve,
            teamEpreuve: equipe.team?.epreuve,
            epreuveDetected: epreuve,
            journee: match.journee,
            phase: match.phase,
            matchId: match.id,
          });
        }

        if (!epreuve || !match.journee || !match.phase) {
          if (match.idEpreuve === 15980 || equipe.team?.idEpreuve === 15980) {
            console.log("[Disponibilites] Match Paris rejeté:", {
              epreuve,
              journee: match.journee,
              phase: match.phase,
            });
          }
          return;
        }

        // Pour le championnat de Paris, accepter toutes les phases (il n'y en a qu'une)
        // Pour le championnat par équipes, accepter uniquement "aller" et "retour"
        const phaseLower = match.phase.toLowerCase();
        let phase: "aller" | "retour";

        if (epreuve === "championnat_paris") {
          // Pour Paris, normaliser toutes les phases en "aller" (car il n'y a qu'une phase)
          phase = "aller";
        } else if (phaseLower === "aller" || phaseLower === "retour") {
          phase = phaseLower as "aller" | "retour";
        } else {
          // Phase non reconnue pour le championnat par équipes
          return;
        }

        if (!journeesMap.has(epreuve)) {
          journeesMap.set(epreuve, new Map());
        }
        const epreuveMap = journeesMap.get(epreuve)!;

        if (!epreuveMap.has(phase)) {
          epreuveMap.set(phase, new Map());
        }
        const phaseMap = epreuveMap.get(phase)!;

        // Normaliser la date du match pour éviter les problèmes de timezone
        // En créant une nouvelle date avec uniquement année/mois/jour
        let matchDate: Date;
        if (match.date instanceof Date) {
          matchDate = new Date(
            match.date.getFullYear(),
            match.date.getMonth(),
            match.date.getDate()
          );
        } else {
          const date = new Date(match.date);
          matchDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );
        }

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
      });
    });

    // Trier les dates pour chaque journée
    journeesMap.forEach((epreuveMap) => {
      epreuveMap.forEach((phaseMap) => {
        phaseMap.forEach((journeeData) => {
          journeeData.dates.sort((a, b) => a.getTime() - b.getTime());
        });
      });
    });

    // Debug: log pour voir ce qui a été extrait
    const parisPhases = journeesMap.get("championnat_paris");
    const equipesPhases = journeesMap.get("championnat_equipes");
    console.log("[Disponibilites] Journées extraites par épreuve:", {
      championnat_equipes: equipesPhases?.size || 0,
      championnat_paris: parisPhases?.size || 0,
      details: {
        championnat_equipes: equipesPhases
          ? Array.from(equipesPhases.entries()).map(([phase, phaseMap]) => ({
              phase,
              journees: Array.from(phaseMap.keys()),
            }))
          : [],
        championnat_paris: parisPhases
          ? Array.from(parisPhases.entries()).map(([phase, phaseMap]) => ({
              phase,
              journees: Array.from(phaseMap.keys()),
            }))
          : [],
      },
    });

    return journeesMap;
  }, [equipes, equipesByType.feminin, equipesByType.masculin]);

  // Extraire les journées pour l'épreuve sélectionnée
  const journeesByPhase = useMemo(() => {
    if (!selectedEpreuve) {
      return new Map<
        "aller" | "retour",
        Map<
          number,
          { journee: number; phase: "aller" | "retour"; dates: Date[] }
        >
      >();
    }
    return journeesByEpreuveAndPhase.get(selectedEpreuve) || new Map();
  }, [selectedEpreuve, journeesByEpreuveAndPhase]);

  // Calculer l'épreuve avec la prochaine journée la plus proche (basée sur la date de début)
  const defaultEpreuve = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let closestEpreuve: EpreuveType | null = null;
    let closestDate: Date | null = null;

    for (const [epreuve, epreuveMap] of journeesByEpreuveAndPhase) {
      for (const [phase, phaseMap] of epreuveMap) {
        for (const [journee, journeeData] of phaseMap) {
          if (journeeData.dates.length > 0) {
            // Utiliser la date de début (minimum) plutôt que la fin
            const debutJournee = new Date(
              Math.min(...journeeData.dates.map((d) => d.getTime()))
            );
            debutJournee.setHours(0, 0, 0, 0);

            if (debutJournee >= now) {
              if (!closestDate || debutJournee < closestDate) {
                closestDate = new Date(debutJournee);
                closestEpreuve = epreuve;
                console.log(
                  `[Disponibilites] Nouvelle épreuve la plus proche: ${epreuve}, journée ${journee}, phase ${phase}, date: ${
                    debutJournee.toISOString().split("T")[0]
                  }`
                );
              }
            }
          }
        }
      }
    }

    const formattedDate: string =
      closestDate !== null
        ? (closestDate as Date).toISOString().split("T")[0]
        : "aucune";
    console.log(
      `[Disponibilites] Épreuve par défaut sélectionnée: ${
        closestEpreuve || "championnat_equipes"
      }, date la plus proche: ${formattedDate}`
    );
    return (closestEpreuve ||
      ("championnat_equipes" as EpreuveType)) as EpreuveType; // Fallback sur championnat_equipes
  }, [journeesByEpreuveAndPhase]);

  // Initialiser selectedEpreuve avec l'épreuve par défaut
  // Utiliser une ref pour suivre si on a déjà initialisé une fois
  const hasInitializedEpreuve = React.useRef(false);

  useEffect(() => {
    // Initialiser seulement si :
    // 1. On n'a pas encore initialisé ET selectedEpreuve est null
    // 2. OU on n'a pas encore initialisé ET defaultEpreuve est disponible
    if (!hasInitializedEpreuve.current) {
      if (defaultEpreuve && journeesByEpreuveAndPhase.has(defaultEpreuve)) {
        // Vérifier que defaultEpreuve a des données réelles (pas juste le fallback)
        const hasRealData = Array.from(
          journeesByEpreuveAndPhase.get(defaultEpreuve)?.values() || []
        ).some((phaseMap) => phaseMap.size > 0);
        if (hasRealData) {
          setSelectedEpreuve(defaultEpreuve);
          hasInitializedEpreuve.current = true;
        }
      }
    }
  }, [
    defaultEpreuve,
    journeesByEpreuveAndPhase,
    selectedEpreuve,
    setSelectedEpreuve,
  ]);

  // Initialiser selectedPhase avec la phase en cours
  useEffect(() => {
    if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase, setSelectedPhase]);

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
  }, [players, showAllPlayers, searchQuery, selectedEpreuve]);

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

        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <EpreuveSelect
                value={selectedEpreuve}
                onChange={(epreuve) => {
                  setSelectedEpreuve(epreuve);
                  setSelectedPhase(null);
                  setSelectedJournee(null);
                }}
              />
              {selectedEpreuve !== "championnat_paris" && (
                <PhaseSelect
                  value={selectedPhase}
                  onChange={(phase) => {
                    setSelectedPhase(phase);
                    setSelectedJournee(null);
                  }}
                  disabled={selectedEpreuve === null}
                />
              )}
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
                  disabled={
                    (selectedEpreuve === "championnat_paris"
                      ? false
                      : selectedPhase === null) || selectedEpreuve === null
                  }
                >
                  {(() => {
                    const phaseToUse =
                      selectedEpreuve === "championnat_paris"
                        ? "aller"
                        : selectedPhase;

                    if (!phaseToUse) return null;

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
                          .map((date: Date) => {
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
                      });
                  })()}
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
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher un joueur..."
                sx={{ mt: 2.5, mb: 0.75 }}
              />
            )}
          </CardContent>
        </Card>

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
                {...(() => {
                  // Extraire automatiquement les dates vendredi/samedi depuis les matchs
                  if (
                    selectedEpreuve === "championnat_equipes" &&
                    selectedJournee !== null &&
                    selectedPhase !== null &&
                    journeesByPhase.has(selectedPhase)
                  ) {
                    const journeeData = journeesByPhase
                      .get(selectedPhase)
                      ?.get(selectedJournee);
                    if (journeeData && journeeData.dates.length > 0) {
                      // Trier les dates
                      const sortedDates = [...journeeData.dates].sort(
                        (a, b) => a.getTime() - b.getTime()
                      );

                      console.log(
                        "[DiscordPollManager] Dates trouvées pour la journée:",
                        {
                          journee: selectedJournee,
                          phase: selectedPhase,
                          dates: sortedDates.map((d) => ({
                            date: d.toISOString().split("T")[0],
                            dayOfWeek: d.getDay(),
                            dayName: d.toLocaleDateString("fr-FR", {
                              weekday: "long",
                            }),
                          })),
                        }
                      );

                      // Identifier vendredi (jour 5) et samedi (jour 6) parmi toutes les dates
                      // Normaliser les dates pour éviter les problèmes de timezone
                      let fridayDate: Date | null = null;
                      let saturdayDate: Date | null = null;

                      for (const date of sortedDates) {
                        // Normaliser la date en créant une nouvelle date avec uniquement année/mois/jour
                        // pour éviter les problèmes de timezone
                        const normalizedDate = new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate()
                        );
                        const dayOfWeek = normalizedDate.getDay(); // 0 = dimanche, 5 = vendredi, 6 = samedi
                        if (dayOfWeek === 5 && !fridayDate) {
                          fridayDate = normalizedDate;
                        } else if (dayOfWeek === 6 && !saturdayDate) {
                          saturdayDate = normalizedDate;
                        }
                      }

                      console.log(
                        "[DiscordPollManager] Dates vendredi/samedi identifiées:",
                        {
                          fridayDate: fridayDate
                            ? fridayDate.toISOString().split("T")[0]
                            : null,
                          saturdayDate: saturdayDate
                            ? saturdayDate.toISOString().split("T")[0]
                            : null,
                        }
                      );

                      // Retourner les dates trouvées
                      const result: {
                        fridayDate?: string;
                        saturdayDate?: string;
                      } = {};

                      if (fridayDate) {
                        // Formater la date en YYYY-MM-DD en évitant les problèmes de timezone
                        const year = fridayDate.getFullYear();
                        const month = String(
                          fridayDate.getMonth() + 1
                        ).padStart(2, "0");
                        const day = String(fridayDate.getDate()).padStart(
                          2,
                          "0"
                        );
                        result.fridayDate = `${year}-${month}-${day}`;
                      }
                      if (saturdayDate) {
                        const year = saturdayDate.getFullYear();
                        const month = String(
                          saturdayDate.getMonth() + 1
                        ).padStart(2, "0");
                        const day = String(saturdayDate.getDate()).padStart(
                          2,
                          "0"
                        );
                        result.saturdayDate = `${year}-${month}-${day}`;
                      }

                      if (Object.keys(result).length > 0) {
                        return result;
                      }
                    }
                  }
                  return {};
                })()}
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
    championshipType: ChampionshipType,
    available: boolean
  ) => void;
  onCommentChange: (
    playerId: string,
    championshipType: ChampionshipType,
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
  const isParisChampionship = selectedEpreuve === "championnat_paris";
  const [expandedPlayer, setExpandedPlayer] = useState<{
    id: string;
    type: ChampionshipType;
  } | null>(null);

  return (
    <Box>
      {players.map((player) => {
        const playerAvailabilities = availabilities[player.id] || {};
        const masculinAvailability = playerAvailabilities.masculin;
        const femininAvailability = playerAvailabilities.feminin;
        const isFemale = player.gender === "F";

        // Pour le championnat de Paris : un seul sondage, tous répondent une seule fois
        // Pour le championnat par équipes : les hommes répondent masculin, les femmes peuvent répondre masculin ET féminin
        const hasRespondedMasculin =
          typeof masculinAvailability?.available === "boolean";
        const hasRespondedFeminin =
          typeof femininAvailability?.available === "boolean";

        let hasResponded: boolean;
        if (isParisChampionship) {
          hasResponded = hasRespondedMasculin;
        } else {
          if (isFemale) {
            hasResponded = hasRespondedMasculin && hasRespondedFeminin;
          } else {
            hasResponded = hasRespondedMasculin;
          }
        }

        const isExpanded = expandedPlayer?.id === player.id;

        return (
          <Card
            key={player.id}
            sx={{
              mb: 1,
              borderLeft: hasResponded
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
                  {player.isWheelchair && (
                    <Tooltip title="Joueur en fauteuil">
                      <AccessibleIcon
                        fontSize="small"
                        sx={{ color: "primary.main", ml: 0.5 }}
                      />
                    </Tooltip>
                  )}
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
                  <Box
                    display="flex"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {isParisChampionship ? (
                      <AvailabilityStatusChip
                        status={
                          masculinAvailability?.available === true
                            ? "available"
                            : masculinAvailability?.available === false
                            ? "unavailable"
                            : masculinAvailability?.comment
                            ? "pending"
                            : "unknown"
                        }
                      />
                    ) : (
                      <AvailabilityStatusChip
                        status={
                          masculinAvailability?.available === true
                            ? "available"
                            : masculinAvailability?.available === false
                            ? "unavailable"
                            : masculinAvailability?.comment
                            ? "pending"
                            : "unknown"
                        }
                        label="Masculin"
                      />
                    )}
                    {isFemale && !isParisChampionship && (
                      <>
                        <AvailabilityStatusChip
                          status={
                            femininAvailability?.available === true
                              ? "available"
                              : femininAvailability?.available === false
                              ? "unavailable"
                              : femininAvailability?.comment
                              ? "pending"
                              : "unknown"
                          }
                          label="Féminin"
                        />
                        {typeof femininAvailability?.fridayAvailable ===
                          "boolean" && (
                          <AvailabilityStatusChip
                            status={
                              femininAvailability.fridayAvailable === true
                                ? "available"
                                : "unavailable"
                            }
                            label="Vendredi"
                          />
                        )}
                        {typeof femininAvailability?.saturdayAvailable ===
                          "boolean" && (
                          <AvailabilityStatusChip
                            status={
                              femininAvailability.saturdayAvailable === true
                                ? "available"
                                : "unavailable"
                            }
                            label="Samedi"
                          />
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={1}
                  sx={{ minWidth: { xs: "100%", sm: 280 } }}
                >
                  {/* Disponibilité - Pour le championnat de Paris : un seul sondage */}
                  {/* Pour le championnat par équipes : les femmes ont deux champs (masculin et féminin) */}
                  {isParisChampionship ? (
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

                      {/* Disponibilité Féminine (uniquement pour les femmes en championnat par équipes) */}
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
                  {isParisChampionship ? (
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

                      {/* Commentaire Féminin (uniquement pour les femmes en championnat par équipes) */}
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
                (isFemale &&
                  !isParisChampionship &&
                  femininAvailability?.comment)) &&
                !isExpanded && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {isParisChampionship ? (
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
