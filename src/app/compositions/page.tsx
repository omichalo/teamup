"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  TextField,
} from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AvailabilityService } from "@/lib/services/availability-service";
import { CompositionService } from "@/lib/services/composition-service";
import { Player } from "@/types/team-management";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import { extractTeamNumber, validateFFTTRules } from "@/lib/shared/fftt-utils";

// Constante pour la journée concernée par la règle
const JOURNEE_CONCERNEE_PAR_REGLE = 2;

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const availabilityService = useMemo(() => new AvailabilityService(), []);
  const compositionService = useMemo(() => new CompositionService(), []);

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

          setAvailabilities({
            masculin: masculineAvailability?.players || {},
            feminin: feminineAvailability?.players || {},
          });
        } catch (error) {
          console.error("Erreur lors du chargement des disponibilités:", error);
          setAvailabilities({});
        }
      };
      loadAvailability();
    }
  }, [selectedJournee, selectedPhase, availabilityService]);

  // Charger les compositions pour la journée et phase sélectionnées
  useEffect(() => {
    if (selectedJournee !== null && selectedPhase !== null) {
      const loadCompositions = async () => {
        try {
          const championshipType = tabValue === 0 ? "masculin" : "feminin";
          const composition = await compositionService.getComposition(
            selectedJournee,
            selectedPhase,
            championshipType
          );

          if (composition) {
            setCompositions(composition.teams);
          } else {
            setCompositions({});
          }
        } catch (error) {
          console.error("Erreur lors du chargement des compositions:", error);
          setCompositions({});
        }
      };
      loadCompositions();
    }
  }, [selectedJournee, selectedPhase, tabValue, compositionService]);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fonction pour trouver le match correspondant à une équipe pour la journée et phase sélectionnées
  const getMatchForTeam = useCallback(
    (equipe: { team: { id: string }; matches: any[] }) => {
      if (selectedJournee === null || selectedPhase === null) {
        return null;
      }
      const match = equipe.matches.find(
        (match) =>
          match.journee === selectedJournee &&
          match.phase?.toLowerCase() === selectedPhase.toLowerCase()
      );
      if (match) {
        console.log(
          `🔍 Match trouvé pour ${equipe.team.name} (Journée ${selectedJournee}, Phase ${selectedPhase}):`,
          {
            matchId: match.id,
            score: match.score,
            result: match.result,
            journee: match.journee,
            phase: match.phase,
            date: match.date,
          }
        );
      } else {
        console.log(
          `⚠️ Aucun match trouvé pour ${equipe.team.name} (Journée ${selectedJournee}, Phase ${selectedPhase})`
        );
      }
      return match;
    },
    [selectedJournee, selectedPhase]
  );

  // Fonction pour trouver le match d'une équipe pour une journée et phase spécifiques
  const getMatchForTeamAndJournee = useCallback(
    (
      equipe: { team: { id: string }; matches: any[] },
      journee: number,
      phase: string
    ) => {
      return equipe.matches.find(
        (match) =>
          match.journee === journee &&
          match.phase?.toLowerCase() === phase.toLowerCase()
      );
    },
    []
  );

  // Fonction pour vérifier si un match est déjà joué
  const isMatchPlayed = (match: any): boolean => {
    if (!match) {
      console.log("🔍 isMatchPlayed: pas de match fourni, retourne false");
      return false;
    }

    // Un match est joué si :
    // 1. Il a des joueurs dans joueursSQY (le plus fiable car ça vient des données du match joué)
    // 2. OU (le score est présent ET a un format valide avec au moins un score > 0 ET le result est valide)
    // Note: on ne se fie pas au result seul car "ÉGALITÉ" avec score "0-0" n'est pas un match joué

    // Vérifier la présence de joueurs (le plus fiable)
    const hasPlayers =
      match.joueursSQY &&
      Array.isArray(match.joueursSQY) &&
      match.joueursSQY.length > 0;

    // Vérifier le score (mais exclure 0-0 car ce n'est pas un match réellement joué)
    let hasValidScore = false;
    const scoreValue = match.score;
    const scoreType = typeof scoreValue;
    const scoreIsString = scoreType === "string";
    const scoreNotEmpty = scoreIsString && scoreValue !== "";
    const scoreNotAVenir = scoreIsString && scoreValue !== "À VENIR";
    const scoreNotZeroZero = scoreIsString && scoreValue !== "0-0";

    if (
      scoreValue &&
      scoreIsString &&
      scoreNotEmpty &&
      scoreNotAVenir &&
      scoreNotZeroZero
    ) {
      // Vérifier que le score a un format valide (ex: "4-2", "3-3") et qu'au moins un score > 0
      const scoreMatch = scoreValue.match(/^(\d+)-(\d+)$/);
      if (scoreMatch !== null && scoreMatch.length === 3) {
        const scoreA = parseInt(scoreMatch[1], 10);
        const scoreB = parseInt(scoreMatch[2], 10);
        // Au moins un des deux scores doit être > 0
        hasValidScore = scoreA > 0 || scoreB > 0;
      }
    }

    // Vérifier le result (mais seulement si on a aussi un score valide)
    // On ne se fie pas au result seul car "ÉGALITÉ" avec score "0-0" n'est pas un match joué
    const validResults = ["VICTOIRE", "DÉFAITE", "ÉGALITÉ", "NUL", "DEFAITE"]; // DEFAITE sans accent aussi
    const resultValue = match.result;
    const resultType = typeof resultValue;
    const resultIsString = resultType === "string";
    const resultNotAVenir = resultIsString && resultValue !== "À VENIR";
    const resultInValidList =
      resultIsString && validResults.includes(resultValue.toUpperCase());
    const hasValidResult =
      hasValidScore &&
      resultValue &&
      resultIsString &&
      resultNotAVenir &&
      resultInValidList;

    const isPlayed = hasPlayers || hasValidScore || hasValidResult;

    // Log détaillé pour debug
    console.log(`🔍 isMatchPlayed pour match ${match.id || "unknown"}:`, {
      hasPlayers: hasPlayers,
      joueursSQYCount: match.joueursSQY?.length || 0,
      score: {
        value: scoreValue,
        type: scoreType,
        isString: scoreIsString,
        notEmpty: scoreNotEmpty,
        notAVenir: scoreNotAVenir,
        notZeroZero: scoreNotZeroZero,
        hasValidFormat: hasValidScore,
      },
      result: {
        value: resultValue,
        type: resultType,
        isString: resultIsString,
        notAVenir: resultNotAVenir,
        inValidList: resultInValidList,
        hasValidResult: hasValidResult,
      },
      isPlayed: isPlayed,
    });

    // Un match est joué si on a des joueurs OU un résultat valide OU un score valide
    return isPlayed;
  };

  // Fonction pour obtenir les joueurs ayant joué un match (depuis joueursSQY)
  const getPlayersFromMatch = useCallback(
    (match: any): Player[] => {
      if (!match || !match.joueursSQY || !Array.isArray(match.joueursSQY)) {
        return [];
      }
      // Trouver les joueurs par leur licence
      return match.joueursSQY
        .map((joueurSQY: any) => {
          if (!joueurSQY.licence) return null;
          return players.find((p) => p.license === joueurSQY.licence);
        })
        .filter((p): p is Player => p !== undefined && p !== null);
    },
    [players]
  );

  // Fonction pour déterminer dans quelle équipe un joueur a joué la 1ère journée
  const getTeamNumberForPlayerJournee1 = useCallback(
    (playerId: string, phase: "aller" | "retour"): number | null => {
      const player = players.find((p) => p.id === playerId);
      if (!player) {
        return null;
      }

      // Parcourir toutes les équipes pour trouver le match de J1
      for (const equipe of equipes) {
        const matchJ1 = getMatchForTeamAndJournee(equipe, 1, phase);

        // Vérifier si le match est joué et contient le joueur
        if (matchJ1 && isMatchPlayed(matchJ1)) {
          const playersFromMatch = getPlayersFromMatch(matchJ1);
          const playerInMatch = playersFromMatch.find((p) => p.id === playerId);

          if (playerInMatch) {
            // Le joueur a joué dans cette équipe lors de la J1
            const teamNumber = extractTeamNumber(equipe.team.name);
            return teamNumber > 0 ? teamNumber : null;
          }
        }
      }

      return null; // Le joueur n'a pas joué la J1
    },
    [
      players,
      equipes,
      getMatchForTeamAndJournee,
      isMatchPlayed,
      getPlayersFromMatch,
    ]
  );

  // Fonction pour vérifier si un joueur a joué J1 dans une équipe de numéro inférieur
  const didPlayerPlayJ1InLowerTeam = useCallback(
    (
      playerId: string,
      targetTeamNumber: number,
      phase: "aller" | "retour"
    ): boolean => {
      const playerJ1TeamNumber = getTeamNumberForPlayerJournee1(
        playerId,
        phase
      );

      if (playerJ1TeamNumber === null) {
        // Le joueur n'a pas joué la J1, donc pas de restriction
        return false;
      }

      // Un joueur a joué dans une équipe "inférieure" si le numéro de son équipe J1 est < numéro équipe cible
      // (équipe 1 est "inférieure" à équipe 6, équipe 2 est "inférieure" à équipe 5, etc.)
      // Cela signifie que le joueur vient d'une équipe plus forte (numéro plus petit) vers une équipe plus faible (numéro plus grand)
      return playerJ1TeamNumber < targetTeamNumber;
    },
    [getTeamNumberForPlayerJournee1]
  );

  // Fonction pour vérifier si un drop est possible
  const canDropPlayer = (
    playerId: string,
    teamId: string
  ): { canDrop: boolean; reason?: string } => {
    const player = players.find((p) => p.id === playerId);
    const equipe = equipes.find((eq) => eq.team.id === teamId);

    if (!player || !equipe) {
      return { canDrop: false, reason: "Données introuvables" };
    }

    // Vérifier le nombre de joueurs
    const currentTeamPlayers = compositions[teamId] || [];
    if (currentTeamPlayers.length >= 4) {
      return {
        canDrop: false,
        reason: "L'équipe est complète (4/4 joueurs)",
      };
    }

    // Vérifier si le joueur est étranger (ETR) et si l'équipe a déjà un joueur étranger
    // (en excluant le joueur actuellement dragué de la vérification)
    if (player.nationality === "ETR") {
      const currentTeamPlayersData = currentTeamPlayers
        .filter((playerId) => playerId !== player.id) // Exclure le joueur actuellement dragué
        .map((playerId) => players.find((p) => p.id === playerId))
        .filter((p): p is Player => p !== undefined);

      const hasForeignPlayer = currentTeamPlayersData.some(
        (p) => p.nationality === "ETR"
      );

      if (hasForeignPlayer) {
        return {
          canDrop: false,
          reason: "L'équipe contient déjà un joueur étranger (ETR)",
        };
      }
    }

    // Vérifier le brûlage
    const teamNumber = extractTeamNumber(equipe.team.name);
    if (teamNumber === 0) {
      // Si on ne peut pas extraire le numéro, on autorise le drop
      return { canDrop: true };
    }

    const isFemaleTeam = equipe.matches.some(
      (match) => match.isFemale === true
    );
    const championshipType = isFemaleTeam ? "feminin" : "masculin";
    const phase = selectedPhase || "aller";

    const burnedTeam =
      championshipType === "masculin"
        ? player.highestMasculineTeamNumberByPhase?.[phase]
        : player.highestFeminineTeamNumberByPhase?.[phase];

    if (burnedTeam !== undefined && burnedTeam !== null) {
      if (teamNumber > burnedTeam) {
        return {
          canDrop: false,
          reason: `Brûlé dans l'équipe ${burnedTeam}, ne peut pas jouer dans l'équipe ${teamNumber}`,
        };
      }
    }

    // Vérifier les règles FFTT
    // Simuler la composition avec le joueur dragué ajouté
    const simulatedTeamPlayers = [
      ...currentTeamPlayers
        .filter((pid) => pid !== player.id) // Exclure le joueur actuellement dragué s'il est déjà dans l'équipe
        .map((pid) => players.find((p) => p.id === pid))
        .filter((p): p is Player => p !== undefined),
      player, // Ajouter le joueur dragué
    ];

    // Vérifier les règles FFTT uniquement si l'équipe est complète (4 joueurs) ou si c'est une règle qui s'applique avant complétion
    const division = equipe.team.division || "";
    const { valid, reason } = validateFFTTRules(
      simulatedTeamPlayers,
      division,
      isFemaleTeam
    );

    if (!valid) {
      return {
        canDrop: false,
        reason: reason || "Règle FFTT non respectée",
      };
    }

    // Vérifier la règle : J2 ne peut pas avoir plus d'un joueur ayant joué J1 dans une équipe inférieure
    if (selectedJournee === JOURNEE_CONCERNEE_PAR_REGLE && selectedPhase) {
      const phase = selectedPhase as "aller" | "retour";

      // Compter combien de joueurs (y compris celui qu'on essaie d'ajouter) ont joué J1 dans une équipe inférieure
      const playersFromLowerTeams = simulatedTeamPlayers.filter((p) =>
        didPlayerPlayJ1InLowerTeam(p.id, teamNumber, phase)
      );

      // Si on essaie d'ajouter un joueur qui a joué J1 dans une équipe inférieure
      const playerFromLowerTeam = didPlayerPlayJ1InLowerTeam(
        player.id,
        teamNumber,
        phase
      );

      if (playerFromLowerTeam && playersFromLowerTeams.length > 1) {
        // Log pour analyse : afficher les joueurs concernés
        const playersInfo = playersFromLowerTeams.map((p) => {
          const j1Team = getTeamNumberForPlayerJournee1(p.id, phase);
          return `${p.firstName} ${p.name} (J1: Éq.${j1Team})`;
        });
        console.log(
          `❌ Règle J${JOURNEE_CONCERNEE_PAR_REGLE}: Éq.${teamNumber} aurait ${playersFromLowerTeams.length} joueurs ayant joué J1 dans une équipe inférieure:`,
          playersInfo
        );

        return {
          canDrop: false,
          reason: `Lors de la ${JOURNEE_CONCERNEE_PAR_REGLE}ème journée, une équipe ne peut comporter qu'un seul joueur ayant joué la 1ère journée dans une équipe de numéro inférieur`,
        };
      }
    }

    return { canDrop: true };
  };

  // Fonction helper pour créer une image de drag uniforme
  // Mutualisée pour les deux cas : joueur depuis la liste disponible ou depuis une équipe
  const createDragImage = (
    player: Player,
    championshipType: "masculin" | "feminin" = "masculin"
  ): HTMLElement => {
    // Obtenir les dimensions approximatives (on va utiliser une largeur fixe raisonnable)
    const width = 300; // Largeur fixe pour l'image de drag
    const minHeight = 60;

    // Créer un élément temporaire
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "-1000px";
    tempDiv.style.left = "-1000px";
    tempDiv.style.width = `${width}px`;
    tempDiv.style.minHeight = `${minHeight}px`;
    tempDiv.style.backgroundColor = "white";
    tempDiv.style.border = "1px solid #ccc";
    tempDiv.style.borderRadius = "4px";
    tempDiv.style.padding = "8px";
    tempDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    tempDiv.style.opacity = "0.9";
    tempDiv.style.pointerEvents = "none";
    tempDiv.style.boxSizing = "border-box";
    tempDiv.style.display = "flex";
    tempDiv.style.alignItems = "center";
    tempDiv.style.flexDirection = "row";

    // Créer la structure de contenu (identique pour les deux cas)
    const clonedContent = document.createElement("div");
    clonedContent.style.width = "100%";
    clonedContent.style.height = "auto";
    clonedContent.style.margin = "0";
    clonedContent.style.padding = "0";
    clonedContent.style.display = "flex";
    clonedContent.style.alignItems = "center";

    // Créer l'icône DragIndicator
    const iconContainer = document.createElement("div");
    iconContainer.style.marginRight = "8px";
    iconContainer.style.display = "flex";
    iconContainer.style.alignItems = "center";
    iconContainer.style.color = "rgba(0, 0, 0, 0.54)";
    iconContainer.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    `;
    clonedContent.appendChild(iconContainer);

    // Créer le contenu principal (nom, chips, points)
    const textContainer = document.createElement("div");
    textContainer.style.flex = "1 1 auto";
    textContainer.style.minWidth = "0";
    textContainer.style.marginTop = "0";
    textContainer.style.marginBottom = "0";

    // Créer le container pour le nom et les chips
    const primaryContainer = document.createElement("div");
    primaryContainer.style.display = "flex";
    primaryContainer.style.alignItems = "center";
    primaryContainer.style.gap = "4px";
    primaryContainer.style.flexWrap = "wrap";
    primaryContainer.style.marginBottom = "4px";

    // Ajouter le nom
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${player.firstName} ${player.name}`;
    nameSpan.style.fontSize = "0.875rem";
    nameSpan.style.fontWeight = "400";
    nameSpan.style.lineHeight = "1.43";
    nameSpan.style.letterSpacing = "0.01071em";
    primaryContainer.appendChild(nameSpan);

    // Créer les chips informatifs directement à partir des données du joueur
    const isEuropean = player.nationality === "C";
    const isForeign = player.nationality === "ETR";
    const phase = selectedPhase || "aller";
    const burnedTeam =
      championshipType === "masculin"
        ? player.highestMasculineTeamNumberByPhase?.[phase]
        : player.highestFeminineTeamNumberByPhase?.[phase];

    if (isEuropean) {
      const euroChip = document.createElement("span");
      euroChip.textContent = "EUR";
      euroChip.style.display = "inline-flex";
      euroChip.style.alignItems = "center";
      euroChip.style.justifyContent = "center";
      euroChip.style.height = "20px";
      euroChip.style.padding = "0 6px";
      euroChip.style.fontSize = "0.7rem";
      euroChip.style.border = "1px solid rgba(25, 118, 210, 0.5)";
      euroChip.style.borderRadius = "16px";
      euroChip.style.color = "rgba(25, 118, 210, 1)";
      euroChip.style.backgroundColor = "transparent";
      primaryContainer.appendChild(euroChip);
    }

    if (isForeign) {
      const etrChip = document.createElement("span");
      etrChip.textContent = "ETR";
      etrChip.style.display = "inline-flex";
      etrChip.style.alignItems = "center";
      etrChip.style.justifyContent = "center";
      etrChip.style.height = "20px";
      etrChip.style.padding = "0 6px";
      etrChip.style.fontSize = "0.7rem";
      etrChip.style.border = "1px solid rgba(237, 108, 2, 0.5)";
      etrChip.style.borderRadius = "16px";
      etrChip.style.color = "rgba(237, 108, 2, 1)";
      etrChip.style.backgroundColor = "transparent";
      primaryContainer.appendChild(etrChip);
    }

    if (burnedTeam !== undefined && burnedTeam !== null) {
      const burnedChip = document.createElement("span");
      burnedChip.textContent = `Brûlé Éq. ${burnedTeam}`;
      burnedChip.style.display = "inline-flex";
      burnedChip.style.alignItems = "center";
      burnedChip.style.justifyContent = "center";
      burnedChip.style.height = "20px";
      burnedChip.style.padding = "0 6px";
      burnedChip.style.fontSize = "0.7rem";
      burnedChip.style.border = "1px solid rgba(211, 47, 47, 0.5)";
      burnedChip.style.borderRadius = "16px";
      burnedChip.style.color = "rgba(211, 47, 47, 1)";
      burnedChip.style.backgroundColor = "transparent";
      primaryContainer.appendChild(burnedChip);
    }

    textContainer.appendChild(primaryContainer);

    // Ajouter les points (secondary text) - toujours créer depuis les données du joueur
    const pointsText = document.createElement("span");
    pointsText.textContent =
      player.points !== undefined && player.points !== null
        ? `${player.points} points`
        : "Points non disponibles";
    pointsText.style.fontSize = "0.75rem";
    pointsText.style.lineHeight = "1.66";
    pointsText.style.color = "rgba(0, 0, 0, 0.6)";
    pointsText.style.display = "block";
    textContainer.appendChild(pointsText);

    clonedContent.appendChild(textContainer);
    tempDiv.appendChild(clonedContent);

    return tempDiv;
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
    const tempDiv = createDragImage(player, championshipType);
    document.body.appendChild(tempDiv);

    // Forcer un reflow pour s'assurer que les dimensions sont calculées
    tempDiv.offsetHeight;

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
      const { canDrop } = canDropPlayer(draggedPlayerId, teamId);
      e.dataTransfer.dropEffect = canDrop ? "move" : "none";
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

    // Extraire le numéro de l'équipe depuis son nom
    const teamNumber = extractTeamNumber(equipe.team.name);

    // Debug: log pour vérifier l'extraction
    console.log("🔍 DEBUG Drop:", {
      teamName: equipe.team.name,
      extractedTeamNumber: teamNumber,
      playerName: `${player.firstName} ${player.name}`,
    });

    // Déterminer le type de championnat (masculin ou féminin)
    const isFemaleTeam = equipe.matches.some(
      (match) => match.isFemale === true
    );
    const championshipType = isFemaleTeam ? "feminin" : "masculin";
    const phase = selectedPhase || "aller";

    // Vérifier le brûlage
    const burnedTeam =
      championshipType === "masculin"
        ? player.highestMasculineTeamNumberByPhase?.[phase]
        : player.highestFeminineTeamNumberByPhase?.[phase];

    console.log("🔍 DEBUG Burnout:", {
      burnedTeam,
      teamNumber,
      championshipType,
      phase,
      highestMasculineTeamNumberByPhase:
        player.highestMasculineTeamNumberByPhase,
      highestFeminineTeamNumberByPhase: player.highestFeminineTeamNumberByPhase,
    });

    // Vérifier que le numéro d'équipe a été extrait correctement
    if (teamNumber === 0) {
      console.warn(
        "⚠️ Impossible d'extraire le numéro d'équipe depuis:",
        equipe.team.name
      );
      // On continue quand même sans vérification de brûlage si on ne peut pas extraire le numéro
    }

    if (burnedTeam !== undefined && burnedTeam !== null && teamNumber > 0) {
      // Si le joueur est brûlé dans une équipe, il ne peut jouer QUE dans cette équipe ou les équipes plus hautes
      // Exemple : brûlé dans l'équipe 2, peut jouer dans l'équipe 1 (plus haute) ou équipe 2 (même niveau)
      // Mais ne peut PAS jouer dans l'équipe 3, 4, etc. (plus basses)
      // Exemple : brûlé dans l'équipe 8, peut jouer dans 1, 2, 3, 4, 5, 6, 7, 8, mais pas dans 9, 10, etc.
      if (teamNumber > burnedTeam) {
        return;
      }
    }

    setCompositions((prev) => {
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

      // Vérifier les règles FFTT avant d'ajouter le joueur
      const simulatedTeamPlayers = [
        ...targetTeamPlayers
          .map((pid) => players.find((p) => p.id === pid))
          .filter((p): p is Player => p !== undefined),
        player, // Ajouter le joueur dragué
      ];

      const division = equipe.team.division || "";
      const { valid } = validateFFTTRules(
        simulatedTeamPlayers,
        division,
        isFemaleTeam
      );

      if (!valid) {
        // Ne pas ajouter le joueur si les règles FFTT ne sont pas respectées
        // Le feedback visuel via canDropPlayer suffit
        return prev;
      }

      // Vérifier la règle : J2 ne peut pas avoir plus d'un joueur ayant joué J1 dans une équipe inférieure
      if (selectedJournee === JOURNEE_CONCERNEE_PAR_REGLE && selectedPhase) {
        const phaseValue = selectedPhase as "aller" | "retour";

        // Compter combien de joueurs (y compris celui qu'on essaie d'ajouter) ont joué J1 dans une équipe inférieure
        const playersFromLowerTeams = simulatedTeamPlayers.filter((p) =>
          didPlayerPlayJ1InLowerTeam(p.id, teamNumber, phaseValue)
        );

        // Si on essaie d'ajouter un joueur qui a joué J1 dans une équipe inférieure
        const playerFromLowerTeam = didPlayerPlayJ1InLowerTeam(
          player.id,
          teamNumber,
          phaseValue
        );

        if (playerFromLowerTeam && playersFromLowerTeams.length > 1) {
          // Il y a déjà au moins un joueur qui a joué J1 dans une équipe inférieure
          // Ne pas ajouter le joueur
          return prev;
        }
      }

      // Ajouter le joueur à la nouvelle équipe
      const newCompositions = {
        ...updatedCompositions,
        [teamId]: [...targetTeamPlayers, playerId],
      };

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
        <Box sx={{ p: 3 }}>
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

          {selectedJournee && selectedPhase && (
            <>
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="Équipes Masculines" />
                  <Tab label="Équipes Féminines" />
                </Tabs>
              </Box>

              <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
                {/* Zone sticky pour les joueurs disponibles */}
                <Paper
                  sx={{
                    position: "sticky",
                    top: 20,
                    alignSelf: "flex-start",
                    minWidth: 300,
                    maxWidth: 350,
                    maxHeight: "calc(100vh - 100px)",
                    overflow: "auto",
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Joueurs disponibles
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      {tabValue === 0 ? "Masculin" : "Féminin"} - Journée{" "}
                      {selectedJournee}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Rechercher un joueur..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    {availablePlayers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucun joueur disponible
                      </Typography>
                    ) : filteredAvailablePlayers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucun joueur trouvé pour &ldquo;{searchQuery}&rdquo;
                      </Typography>
                    ) : (
                      <List dense>
                        {filteredAvailablePlayers
                          .filter((player) => {
                            // Filtrer les joueurs qui ne sont dans aucune équipe du type actuel
                            const currentTypeEquipes =
                              tabValue === 0
                                ? equipesByType.masculin
                                : equipesByType.feminin;
                            return !currentTypeEquipes.some((equipe) =>
                              compositions[equipe.team.id]?.includes(player.id)
                            );
                          })
                          .map((player) => {
                            // Déterminer le brûlage selon l'onglet et la phase
                            const championshipType =
                              tabValue === 0 ? "masculin" : "feminin";
                            const phase = selectedPhase || "aller";

                            const burnedTeam =
                              championshipType === "masculin"
                                ? player.highestMasculineTeamNumberByPhase?.[
                                    phase
                                  ]
                                : player.highestFeminineTeamNumberByPhase?.[
                                    phase
                                  ];

                            // Déterminer si le joueur est étranger ou européen
                            const isForeign = player.nationality === "ETR";
                            const isEuropean = player.nationality === "C";

                            return (
                              <ListItem
                                key={player.id}
                                disablePadding
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(e, player.id)
                                }
                                onDragEnd={handleDragEnd}
                                sx={{
                                  cursor: "grab",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  mb: 1,
                                  backgroundColor: "background.paper",
                                  "&:hover": {
                                    backgroundColor: "action.hover",
                                    borderColor: "primary.main",
                                    boxShadow: 1,
                                    cursor: "grab",
                                  },
                                  "&:active": {
                                    cursor: "grabbing",
                                    opacity: 0.5,
                                  },
                                }}
                              >
                                <ListItemButton>
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
                                        <Typography
                                          variant="body2"
                                          component="span"
                                        >
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
                          })}
                      </List>
                    )}
                  </Box>
                </Paper>

                {/* Zone principale pour les équipes */}
                <Box sx={{ flex: 1 }}>
                  {/* Bilan de complétude des compositions */}
                  <Paper
                    sx={{ p: 2, mb: 3, backgroundColor: "background.default" }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Bilan des compositions
                    </Typography>
                    {(() => {
                      const currentTypeEquipes =
                        tabValue === 0
                          ? equipesByType.masculin
                          : equipesByType.feminin;

                      let totalEquipes = 0;
                      let equipesCompletes = 0;
                      let equipesIncompletes = 0;
                      let equipesMatchsJoues = 0;

                      currentTypeEquipes.forEach((equipe) => {
                        const match = getMatchForTeam(equipe);
                        const matchPlayed = isMatchPlayed(match);

                        if (matchPlayed) {
                          equipesMatchsJoues++;
                        } else {
                          const teamPlayers =
                            compositions[equipe.team.id] || [];
                          const teamPlayersData = teamPlayers
                            .map((playerId) =>
                              players.find((p) => p.id === playerId)
                            )
                            .filter((p): p is Player => p !== undefined);

                          totalEquipes++;
                          if (teamPlayersData.length >= 4) {
                            equipesCompletes++;
                          } else {
                            equipesIncompletes++;
                          }
                        }
                      });

                      const totalEditable =
                        equipesCompletes + equipesIncompletes;
                      const pourcentageComplet =
                        totalEditable > 0
                          ? Math.round((equipesCompletes / totalEditable) * 100)
                          : 0;

                      return (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Chip
                            label={`${totalEditable} équipe${
                              totalEditable > 1 ? "s" : ""
                            } à composer`}
                            color="default"
                            variant="outlined"
                          />
                          <Chip
                            label={`${equipesCompletes} complète${
                              equipesCompletes > 1 ? "s" : ""
                            } (4/4)`}
                            color="success"
                            variant={
                              equipesCompletes > 0 ? "filled" : "outlined"
                            }
                          />
                          <Chip
                            label={`${equipesIncompletes} incomplète${
                              equipesIncompletes > 1 ? "s" : ""
                            }`}
                            color="warning"
                            variant={
                              equipesIncompletes > 0 ? "filled" : "outlined"
                            }
                          />
                          {equipesMatchsJoues > 0 && (
                            <Chip
                              label={`${equipesMatchsJoues} match${
                                equipesMatchsJoues > 1 ? "s" : ""
                              } joué${equipesMatchsJoues > 1 ? "s" : ""}`}
                              color="info"
                              variant="outlined"
                            />
                          )}
                          {totalEditable > 0 && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: "auto" }}
                            >
                              {pourcentageComplet}% complété
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </Paper>

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
                          // Trouver le match correspondant
                          const match = getMatchForTeam(equipe);
                          const matchPlayed = isMatchPlayed(match);

                          // Si le match est joué, utiliser les joueurs du match, sinon la composition
                          const teamPlayers = matchPlayed
                            ? getPlayersFromMatch(match)
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

                          // Désactiver le drag & drop si le match est joué
                          // isDragOver est true seulement si on survole AVEC un joueur dragué (dragOverTeamId doit être défini)
                          const isDragOver =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id;
                          // Ne calculer dropCheck que si on est vraiment en train de draguer ET de survoler cette équipe
                          // Sinon, pas de raison à afficher
                          const dropCheck =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : { canDrop: true, reason: undefined };
                          const canDrop = matchPlayed
                            ? false
                            : dropCheck.canDrop;
                          const isFull = teamPlayersData.length >= 4;

                          return (
                            <Card
                              key={equipe.team.id}
                              elevation={0}
                              {...(!matchPlayed &&
                                draggedPlayerId &&
                                dragOverTeamId === equipe.team.id && {
                                  className: canDrop
                                    ? "droppable--over"
                                    : "droppable--blocked",
                                })}
                              onDragOver={
                                matchPlayed
                                  ? undefined
                                  : (e) => handleDragOver(e, equipe.team.id)
                              }
                              onDragLeave={
                                matchPlayed ? undefined : handleDragLeave
                              }
                              onDrop={
                                matchPlayed
                                  ? undefined
                                  : (e) => handleDrop(e, equipe.team.id)
                              }
                              sx={{
                                position: "relative",
                                cursor:
                                  !matchPlayed &&
                                  draggedPlayerId &&
                                  dragOverTeamId === equipe.team.id
                                    ? canDrop
                                      ? "grab"
                                      : "not-allowed"
                                    : undefined,
                                border: "2px dashed",
                                borderColor: matchPlayed
                                  ? "info.main"
                                  : teamPlayersData.length >= 4
                                  ? "success.main"
                                  : dragOverTeamId === equipe.team.id &&
                                    draggedPlayerId
                                  ? canDrop
                                    ? "primary.main"
                                    : "error.main"
                                  : "divider",
                                opacity: isDragOver && !canDrop ? 0.5 : 1,
                                transition: "opacity 0.2s ease-in-out",
                                backgroundColor: matchPlayed
                                  ? "action.disabledBackground"
                                  : "background.paper",
                                boxShadow: "none",
                                "&:hover": {
                                  borderColor: matchPlayed
                                    ? "info.main"
                                    : teamPlayersData.length >= 4
                                    ? "success.main"
                                    : dragOverTeamId === equipe.team.id &&
                                      draggedPlayerId
                                    ? canDrop
                                      ? "primary.main"
                                      : "error.main"
                                    : "primary.main",
                                  backgroundColor: matchPlayed
                                    ? "action.disabledBackground"
                                    : "action.hover",
                                },
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Typography variant="h6">
                                      {equipe.team.name}
                                    </Typography>
                                    {matchPlayed && (
                                      <Chip
                                        label="Match joué"
                                        size="small"
                                        color="info"
                                        variant="filled"
                                      />
                                    )}
                                  </Box>
                                  <Chip
                                    label={`${teamPlayersData.length}/4 joueurs`}
                                    size="small"
                                    color={
                                      teamPlayersData.length >= 4
                                        ? "success"
                                        : "default"
                                    }
                                    variant={
                                      teamPlayersData.length >= 4
                                        ? "filled"
                                        : "outlined"
                                    }
                                  />
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                {matchPlayed && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      mb: 2,
                                      display: "block",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Composition du match joué (non modifiable)
                                  </Typography>
                                )}
                                {/* Afficher le message d'erreur seulement lors du survol avec un joueur dragué */}
                                {isDragOver && !canDrop && dropCheck.reason && (
                                  <Box
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      mb: 2,
                                      backgroundColor: "error.main",
                                      color: "error.contrastText",
                                      borderRadius: 1,
                                      textAlign: "center",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      fontWeight="bold"
                                    >
                                      ❌ {dropCheck.reason}
                                    </Typography>
                                  </Box>
                                )}
                                {teamPlayersData.length === 0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      py: 2,
                                      textAlign: "center",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Déposez des joueurs ici
                                  </Typography>
                                )}
                                {teamPlayersData.length > 0 && (
                                  <Box
                                    sx={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: 1,
                                    }}
                                  >
                                    {teamPlayersData.map((player) => {
                                      const championshipType = "masculin";
                                      const phase = selectedPhase || "aller";
                                      const burnedTeam =
                                        player
                                          .highestMasculineTeamNumberByPhase?.[
                                          phase
                                        ];
                                      const isForeign =
                                        player.nationality === "ETR";
                                      const isEuropean =
                                        player.nationality === "C";

                                      return (
                                        <Box
                                          key={player.id}
                                          draggable
                                          onDragStart={(e) =>
                                            handleDragStart(e, player.id)
                                          }
                                          onDragEnd={handleDragEnd}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            p: 1,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 1,
                                            position: "relative",
                                            cursor: "grab",
                                            "&:hover": {
                                              backgroundColor: "action.hover",
                                              borderColor: "primary.main",
                                              boxShadow: 1,
                                            },
                                            "&:active": {
                                              cursor: "grabbing",
                                              opacity: 0.7,
                                            },
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              flex: 1,
                                              minWidth: 0,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                flexWrap: "wrap",
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                component="span"
                                                sx={{
                                                  fontWeight: "medium",
                                                }}
                                              >
                                                {player.firstName} {player.name}
                                              </Typography>
                                              {isEuropean && (
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
                                              {isForeign && (
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
                                            </Box>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {player.points !== undefined &&
                                              player.points !== null
                                                ? `${player.points} points`
                                                : "Points non disponibles"}
                                            </Typography>
                                          </Box>
                                          {!matchPlayed && (
                                            <Chip
                                              label="×"
                                              size="small"
                                              data-chip="remove"
                                              draggable={false}
                                              onDragStart={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                              }}
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePlayer(
                                                  equipe.team.id,
                                                  player.id
                                                );
                                              }}
                                              sx={{
                                                cursor: "pointer",
                                                minWidth: 24,
                                                height: 24,
                                                "&:hover": {
                                                  backgroundColor: "error.main",
                                                  color: "white",
                                                },
                                              }}
                                            />
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
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
                          // Trouver le match correspondant
                          const match = getMatchForTeam(equipe);
                          const matchPlayed = isMatchPlayed(match);

                          // Si le match est joué, utiliser les joueurs du match, sinon la composition
                          const teamPlayers = matchPlayed
                            ? getPlayersFromMatch(match)
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

                          // Désactiver le drag & drop si le match est joué
                          // isDragOver est true seulement si on survole avec un joueur dragué
                          // ET qu'on est actuellement en train de draguer (dragOverTeamId est défini)
                          const isDragOver =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id &&
                            dragOverTeamId !== null;
                          // Ne calculer dropCheck que si on est vraiment en train de draguer
                          const dropCheck =
                            !matchPlayed &&
                            draggedPlayerId &&
                            dragOverTeamId === equipe.team.id
                              ? canDropPlayer(draggedPlayerId, equipe.team.id)
                              : { canDrop: true, reason: undefined };
                          const canDrop = matchPlayed
                            ? false
                            : dropCheck.canDrop;
                          const isFull = teamPlayersData.length >= 4;

                          return (
                            <Card
                              key={equipe.team.id}
                              onDragOver={
                                matchPlayed
                                  ? undefined
                                  : (e) => handleDragOver(e, equipe.team.id)
                              }
                              onDragLeave={
                                matchPlayed ? undefined : handleDragLeave
                              }
                              onDrop={
                                matchPlayed
                                  ? undefined
                                  : (e) => handleDrop(e, equipe.team.id)
                              }
                              sx={{
                                border: "2px dashed",
                                borderColor: matchPlayed
                                  ? "info.main"
                                  : teamPlayersData.length >= 4
                                  ? "success.main"
                                  : "divider",
                                opacity: isDragOver && !canDrop ? 0.5 : 1,
                                transition: "opacity 0.2s ease-in-out",
                                backgroundColor: matchPlayed
                                  ? "action.disabledBackground"
                                  : "background.paper",
                                "&:hover": {
                                  borderColor: matchPlayed
                                    ? "info.main"
                                    : teamPlayersData.length >= 4
                                    ? "success.main"
                                    : "primary.main",
                                  backgroundColor: matchPlayed
                                    ? "action.disabledBackground"
                                    : "action.hover",
                                },
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Typography variant="h6">
                                      {equipe.team.name}
                                    </Typography>
                                    {matchPlayed && (
                                      <Chip
                                        label="Match joué"
                                        size="small"
                                        color="info"
                                        variant="filled"
                                      />
                                    )}
                                  </Box>
                                  <Chip
                                    label={`${teamPlayersData.length}/4 joueurs`}
                                    size="small"
                                    color={
                                      teamPlayersData.length >= 4
                                        ? "success"
                                        : "default"
                                    }
                                    variant={
                                      teamPlayersData.length >= 4
                                        ? "filled"
                                        : "outlined"
                                    }
                                  />
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                {matchPlayed && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      mb: 2,
                                      display: "block",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Composition du match joué (non modifiable)
                                  </Typography>
                                )}
                                {/* Afficher le message d'erreur seulement lors du survol avec un joueur dragué */}
                                {isDragOver && !canDrop && dropCheck.reason && (
                                  <Box
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      mb: 2,
                                      backgroundColor: "error.main",
                                      color: "error.contrastText",
                                      borderRadius: 1,
                                      textAlign: "center",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      fontWeight="bold"
                                    >
                                      ❌ {dropCheck.reason}
                                    </Typography>
                                  </Box>
                                )}
                                {teamPlayersData.length === 0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      py: 2,
                                      textAlign: "center",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Déposez des joueurs ici
                                  </Typography>
                                )}
                                {teamPlayersData.length > 0 && (
                                  <Box
                                    sx={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: 1,
                                    }}
                                  >
                                    {teamPlayersData.map((player) => {
                                      const championshipType = "feminin";
                                      const phase = selectedPhase || "aller";
                                      const burnedTeam =
                                        player
                                          .highestFeminineTeamNumberByPhase?.[
                                          phase
                                        ];
                                      const isForeign =
                                        player.nationality === "ETR";
                                      const isEuropean =
                                        player.nationality === "C";

                                      return (
                                        <Box
                                          key={player.id}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            p: 1,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 1,
                                            position: "relative",
                                            "&:hover": {
                                              backgroundColor: "action.hover",
                                            },
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              flex: 1,
                                              minWidth: 0,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                flexWrap: "wrap",
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                component="span"
                                                sx={{
                                                  fontWeight: "medium",
                                                }}
                                              >
                                                {player.firstName} {player.name}
                                              </Typography>
                                              {isEuropean && (
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
                                              {isForeign && (
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
                                            </Box>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {player.points !== undefined &&
                                              player.points !== null
                                                ? `${player.points} points`
                                                : "Points non disponibles"}
                                            </Typography>
                                          </Box>
                                          {!matchPlayed && (
                                            <Chip
                                              label="×"
                                              size="small"
                                              data-chip="remove"
                                              draggable={false}
                                              onDragStart={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                              }}
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePlayer(
                                                  equipe.team.id,
                                                  player.id
                                                );
                                              }}
                                              sx={{
                                                cursor: "pointer",
                                                minWidth: 24,
                                                height: 24,
                                                "&:hover": {
                                                  backgroundColor: "error.main",
                                                  color: "white",
                                                },
                                              }}
                                            />
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    )}
                  </TabPanel>
                </Box>
              </Box>
            </>
          )}

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
