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
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import {
  useEquipesWithMatches,
  type EquipeWithMatches,
} from "@/hooks/useEquipesWithMatches";
import { useCompositionRealtime } from "@/hooks/useCompositionRealtime";
import { useAvailabilityRealtime } from "@/hooks/useAvailabilityRealtime";
import { CompositionService } from "@/lib/services/composition-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { Player } from "@/types/team-management";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { EpreuveType, getIdEpreuve } from "@/lib/shared/epreuve-utils";
import { useChampionshipTypes } from "@/hooks/useChampionshipTypes";
import {
  getMatchForTeamAndJournee,
  isMatchPlayed,
} from "@/lib/compositions/validation";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { CompositionRulesHelp } from "@/components/compositions/CompositionRulesHelp";
import { CompositionTabPanel } from "@/components/compositions/CompositionTabPanel";
import { useMaxPlayersForTeam } from "@/hooks/useMaxPlayersForTeam";
import { useFilteredEquipes } from "@/hooks/useFilteredEquipes";
import { useEquipesByType } from "@/hooks/useEquipesByType";
import { useCanDropPlayer } from "@/hooks/useCanDropPlayer";
import { useCompositionValidation } from "@/hooks/useCompositionValidation";
import { useCompositionDragDrop } from "@/hooks/useCompositionDragDrop";
import { useCompositionRules } from "@/hooks/useCompositionRules";
import { useFilteredPlayers } from "@/hooks/useFilteredPlayers";
import { usePlayersWithoutAssignment } from "@/hooks/usePlayersWithoutAssignment";
import { useCurrentPhase } from "@/hooks/useCurrentPhase";
import { AvailablePlayerItem } from "@/components/compositions/AvailablePlayerItem";
import { useCompositionState } from "@/hooks/useCompositionState";
import { CompositionDialogs } from "@/components/compositions/CompositionDialogs";
import { useDiscordMessage } from "@/hooks/useDiscordMessage";
import { CompositionToolbar } from "@/components/compositions/CompositionToolbar";
import { useCompositionJournees } from "@/hooks/useCompositionJournees";
import { useCompositionPlayers } from "@/hooks/useCompositionPlayers";
import { CompositionSelectors } from "@/components/compositions/CompositionSelectors";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { CompositionTeamList } from "@/components/compositions/CompositionTeamList";

// TabPanel remplacé par CompositionTabPanel

// Le composant MentionSuggestions est maintenant dans DiscordMessageEditor

// Fonction pour nettoyer le nom de l'équipe (retirer "Phase X")
function cleanTeamName(teamName: string): string {
  if (!teamName) return "";
  // Retirer "Phase X" (avec ou sans tiret avant/après)
  return teamName
    .replace(/\s*-\s*Phase\s+\d+\s*/gi, " ")
    .replace(/\s*Phase\s+\d+\s*/gi, " ")
    .trim();
}

// Fonction pour simplifier l'affichage de la division
function formatDivision(division: string): string {
  if (!division) return "";

  // Gérer le championnat de Paris : retirer le préfixe L08_ s'il est présent
  if (division.startsWith("L08_")) {
    return division.replace(/^L08_/, "");
  }

  // Extraire le numéro de poule
  const pouleMatch = division.match(/Poule\s+(\d+)/i);
  const pouleNumber = pouleMatch ? pouleMatch[1] : "";

  // Extraire le type et le numéro de division
  // Format: FED_Nationale X, DXX_Departementale X, LXX_RX, ou Pre-Regionale
  let prefix = "";
  let number = "";

  // Pre-Régionale (format: DXX_Pre-Regionale Dames, ex: D78_Pre-Regionale Dames)
  const preRegionaleMatch = division.match(/Pre-Regionale/i);
  if (preRegionaleMatch) {
    prefix = "PRF";
    number = "";
  } else {
    // Régionale (format: LXX_RX, ex: L08_R2)
    const regionaleMatch = division.match(/L\d+_R(\d+)/i);
    if (regionaleMatch) {
      prefix = "R";
      number = regionaleMatch[1];
    } else {
      // Nationale
      const nationaleMatch = division.match(/Nationale\s+(\d+)/i);
      if (nationaleMatch) {
        prefix = "N";
        number = nationaleMatch[1];
      } else {
        // Départementale
        const departementaleMatch = division.match(/Departementale\s+(\d+)/i);
        if (departementaleMatch) {
          prefix = "D";
          number = departementaleMatch[1];
        }
      }
    }
  }

  // Construire le résultat
  if (prefix) {
    if (number) {
      return pouleNumber
        ? `${prefix}${number} Poule ${pouleNumber}`
        : `${prefix}${number}`;
    } else {
      // Pour Pre-Régionale (pas de numéro)
      return pouleNumber ? `${prefix} Poule ${pouleNumber}` : prefix;
    }
  }

  // Si on n'a pas pu parser, retourner la division originale
  return division;
}

export default function CompositionsPage() {
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const { journeesByEpreuveAndPhase } = useCompositionJournees(equipes);
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType | null>(
    null
  );
  const { players, loadingPlayers, loadPlayers } = useCompositionPlayers({
    includeAllPlayers: false,
    selectedEpreuve,
  });
  const { loadBoth, createEmpty, isParisChampionship } = useChampionshipTypes();

  // Calculer isParis une fois pour éviter les appels répétés
  const isParis = useMemo(
    () => isParisChampionship(selectedEpreuve),
    [isParisChampionship, selectedEpreuve]
  );
  // États pour les compositions
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  const [compositions, setCompositions] = useState<Record<string, string[]>>(
    {}
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
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

  // draggedPlayerId et dragOverTeamId sont maintenant gérés par useCompositionDragDrop
  // État pour la recherche de joueurs
  const [searchQuery, setSearchQuery] = useState<string>("");
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
  // État pour gérer l'affichage du message d'informations du match par équipe
  const [showMatchInfo, setShowMatchInfo] = useState<Record<string, boolean>>(
    {}
  );
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // getDiscordStatus est maintenant importé depuis @/lib/compositions/discord-utils

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

  // Règles de composition
  const compositionRules = useCompositionRules(selectedEpreuve, "daily");

  // Déterminer la phase en cours
  // Gestion de la phase actuelle
  const { currentPhase } = useCurrentPhase({
    equipes,
    loadingEquipes,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  });

  // Filtrer les équipes selon l'épreuve sélectionnée
  const { filteredEquipes } = useFilteredEquipes(equipes, selectedEpreuve);

  // journeesByEpreuveAndPhase est maintenant fourni par useCompositionJournees

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
                  `[Compositions] Nouvelle épreuve la plus proche: ${epreuve}, journée ${journee}, phase ${phase}, date: ${
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
      `[Compositions] Épreuve par défaut sélectionnée: ${
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
  }, [defaultEpreuve, selectedEpreuve, journeesByEpreuveAndPhase]);

  // Initialiser selectedPhase avec la phase en cours
  useEffect(() => {
    if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase]);

  // Initialiser selectedJournee avec la première journée dont la date de début est après aujourd'hui
  useEffect(() => {
    // Pour le championnat de Paris, utiliser "aller" comme phase par défaut
    const phaseToUse = isParis ? "aller" : selectedPhase;

    if (
      selectedEpreuve === null ||
      phaseToUse === null ||
      !journeesByPhase.has(phaseToUse)
    ) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const journees = Array.from(
      journeesByPhase.get(phaseToUse)?.values() || []
    ) as Array<{ journee: number; phase: "aller" | "retour"; dates: Date[] }>;

    // Trouver la prochaine journée basée sur la date de début (minimum)
    const nextJournee = journees
      .sort((a, b) => a.journee - b.journee)
      .find(({ dates }) => {
        if (dates.length === 0) return false;
        const debutJournee = new Date(
          Math.min(...dates.map((d: Date) => d.getTime()))
        );
        debutJournee.setHours(0, 0, 0, 0);
        return debutJournee >= now;
      });

    if (nextJournee) {
      setSelectedJournee(nextJournee.journee);
    } else if (journees.length > 0) {
      // Si aucune journée future, prendre la dernière
      const lastJournee = journees.sort((a, b) => b.journee - a.journee)[0];
      setSelectedJournee(lastJournee.journee);
    }
  }, [selectedPhase, selectedEpreuve, journeesByPhase, isParis]);

  // Charger les joueurs au montage
  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  // Charger les locations via l'API route (évite les problèmes de permissions Firestore côté client)
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch("/api/admin/locations", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log("[Compositions] Locations chargées:", result.locations);
            setLocations(result.locations || []);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
      }
    };
    void loadLocations();
  }, []);

  // Le chargement des membres et canaux Discord est maintenant géré par useDiscordMessage

  const [availabilities, setAvailabilities] = useState<{
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  }>({});
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);

  // Calculer le maxPlayers selon l'épreuve et la division
  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  // Validation des compositions
  const { validationErrors: teamValidationErrors } = useCompositionValidation({
    filteredEquipes,
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    availabilities,
    loadingEquipes,
    loadingPlayers,
    isParis,
  });

  // Charger les disponibilités pour la journée et phase sélectionnées
  useEffect(() => {
    if (!selectedPhase) {
      setDefaultCompositions({ masculin: {}, feminin: {} });
      setDefaultCompositionsLoaded(false);
      return;
    }

    setDefaultCompositionsLoaded(false);

    const loadDefaults = async () => {
      try {
        // Utiliser loadBoth pour charger les compositions en parallèle
        const result = await loadBoth({
          loadMasculin: () =>
            compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          loadFeminin: () =>
            compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
          defaultValue: null,
        });

        setDefaultCompositions({
          masculin: result.data.masculin?.teams || {},
          feminin: result.data.feminin?.teams || {},
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions(createEmpty<Record<string, string[]>>({}));
      }

      setDefaultCompositionsLoaded(true);
    };

    loadDefaults();
  }, [selectedPhase, compositionDefaultsService, loadBoth, createEmpty]);

  // Calculer l'idEpreuve à partir de selectedEpreuve
  const idEpreuve = useMemo(
    () => getIdEpreuve(selectedEpreuve),
    [selectedEpreuve]
  );

  // Écouter les disponibilités en temps réel (masculin)
  const {
    availability: masculineAvailability,
    error: errorMasculineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "masculin",
    idEpreuve
  );

  // Écouter les disponibilités en temps réel (féminin)
  const {
    availability: feminineAvailability,
    error: errorFeminineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "feminin",
    idEpreuve
  );

  // Mettre à jour les disponibilités en temps réel
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setAvailabilities({});
      setAvailabilitiesLoaded(false);
      return;
    }

    setAvailabilities({
      masculin: masculineAvailability?.players || {},
      feminin: feminineAvailability?.players || {},
    });
    setAvailabilitiesLoaded(true);
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

  // Filtrer les joueurs disponibles selon l'onglet sélectionné
  const { availablePlayers } = useAvailablePlayers({
    players,
    selectedEpreuve,
    tabValue,
    availabilities,
    selectedJournee,
    selectedPhase,
    isParis,
  });

  // Filtrer les joueurs disponibles selon la recherche
  const filteredAvailablePlayers = useFilteredPlayers(
    availablePlayers,
    searchQuery
  );

  // Déterminer le type de championnat selon l'onglet actif
  // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
  const championshipType = useMemo(() => {
    return isParis ? "masculin" : tabValue === 0 ? "masculin" : "feminin";
  }, [isParis, tabValue]);

  // Écouter les compositions en temps réel
  const { composition: realtimeComposition, error: compositionError } =
    useCompositionRealtime(selectedJournee, selectedPhase, championshipType);

  // Mettre à jour les compositions en fonction de la composition en temps réel ou des defaults
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setCompositions({});
      return;
    }

    // Si une composition existe en temps réel, l'utiliser
    if (realtimeComposition) {
      setCompositions(realtimeComposition.teams);
      return;
    }

    // Sinon, utiliser les defaults si disponibles
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
        const equipe = equipes.find((e) => e.team.id === teamId);
        const maxPlayers = equipe ? getMaxPlayersForTeam(equipe) : 4;
        const availablePlayerIds = playerIds
          .filter((id) => availabilityMap[id]?.available === true)
          .slice(0, maxPlayers);
        return [teamId, availablePlayerIds];
      })
    );

    setCompositions(initialTeams);
  }, [
    selectedJournee,
    selectedPhase,
    realtimeComposition,
    championshipType,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilities,
    availabilitiesLoaded,
    equipes,
    getMaxPlayersForTeam,
  ]);

  // Gérer les erreurs de chargement
  useEffect(() => {
    if (compositionError) {
      console.error(
        "Erreur lors de l'écoute des compositions:",
        compositionError
      );
    }
  }, [compositionError]);

  // Grouper les équipes par type (masculin/féminin)
  const equipesByType = useEquipesByType(filteredEquipes);

  // Utiliser le hook useDiscordMessage pour gérer toute la logique Discord
  const discordMessage = useDiscordMessage({
    selectedJournee,
    selectedPhase,
    equipesByType,
    locations,
    cleanTeamName,
    formatDivision,
  });

  // Extraire les valeurs du hook
  const {
    discordSentStatus,
    customMessages,
    setCustomMessages,
    confirmResendDialog,
    setConfirmResendDialog,
    discordMembers,
    discordChannels,
    sendMessage: handleSendDiscordMessage,
    formatMatchInfo,
    saveCustomMessage: handleSaveCustomMessage,
    saveTimeoutRef,
  } = discordMessage;

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

  // Utiliser le hook useCompositionState pour gérer les fonctions de composition
  const {
    resetCompositions: runResetCompositions,
    applyDefaults: runApplyDefaultCompositions,
  } = useCompositionState({
    selectedJournee,
    selectedPhase,
    equipesByType,
    filteredEquipes,
    players,
    availabilities,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilitiesLoaded,
    compositionService,
    hasAssignedPlayers,
    hasDefaultCompositions,
    compositions,
    setCompositions,
    isResetting,
    setIsResetting,
    isApplyingDefaults,
    setIsApplyingDefaults,
  });

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

  // Calculer les joueurs sans assignation
  const currentTypeEquipes = useMemo(() => {
    return isParis
      ? [...equipesByType.masculin, ...equipesByType.feminin]
      : tabValue === 0
      ? equipesByType.masculin
      : equipesByType.feminin;
  }, [isParis, tabValue, equipesByType]);

  const {
    availablePlayersWithoutAssignment,
    filteredAvailablePlayersWithoutAssignment,
  } = usePlayersWithoutAssignment({
    availablePlayers,
    filteredAvailablePlayers,
    currentTeams: currentTypeEquipes,
    assignments: compositions,
  });

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

  // Les fonctions Discord sont maintenant gérées par useDiscordMessage

  const compositionSummary = useMemo(() => {
    // Pour le championnat de Paris, utiliser toutes les équipes (masculin + féminin)
    const currentTypeEquipes = isParis
      ? [...equipesByType.masculin, ...equipesByType.feminin]
      : tabValue === 0
      ? equipesByType.masculin
      : equipesByType.feminin;

    let equipesCompletes = 0;
    let equipesIncompletes = 0;
    let equipesInvalides = 0;
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

      const validationError = teamValidationErrors[equipe.team.id];

      if (validationError) {
        equipesInvalides += 1;
        return;
      }

      if (teamPlayersData.length >= 4) {
        equipesCompletes += 1;
      } else {
        equipesIncompletes += 1;
      }
    });

    const totalEditable =
      equipesCompletes + equipesIncompletes + equipesInvalides;
    const percentage =
      totalEditable > 0
        ? Math.round((equipesCompletes / totalEditable) * 100)
        : 0;

    return {
      totalEditable,
      equipesCompletes,
      equipesIncompletes,
      equipesInvalides,
      equipesMatchsJoues,
      percentage,
    };
  }, [
    tabValue,
    equipesByType,
    compositions,
    players,
    getMatchForTeam,
    isParis,
    teamValidationErrors,
  ]);

  // Vérifier si un drop est possible
  const { canDropPlayer } = useCanDropPlayer({
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    isParis,
  });

  // Gestion du drag & drop
  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemovePlayer,
  } = useCompositionDragDrop({
    players,
    equipes,
    filteredEquipes,
    compositions,
    setCompositions,
    selectedPhase,
    selectedJournee,
    tabValue,
    isParis,
    compositionService,
    setDefaultCompositions,
    canDropPlayer,
  });

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
    if (action) {
      void action();
    }
    setConfirmationDialog((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onConfirm, ...rest } = prev;
      return {
        ...rest,
        open: false,
      };
    });

    if (action) {
      void action();
    }
  }, [confirmationDialog.onConfirm]);

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
        <CompositionDialogs
          confirmationDialog={confirmationDialog}
          onCloseConfirmation={handleCancelConfirmation}
          onConfirmConfirmation={handleConfirmDialog}
          confirmResendDialog={confirmResendDialog}
          onCloseResend={() =>
            setConfirmResendDialog({
              open: false,
              teamId: null,
              matchInfo: null,
            })
          }
          onConfirmResend={() => {
            if (
              confirmResendDialog.teamId &&
              confirmResendDialog.matchInfo &&
              selectedJournee &&
              selectedPhase
            ) {
              handleSendDiscordMessage(
                confirmResendDialog.teamId,
                confirmResendDialog.matchInfo,
                selectedJournee,
                selectedPhase,
                confirmResendDialog.channelId
              );
              setConfirmResendDialog({
                open: false,
                teamId: null,
                matchInfo: null,
              });
            }
          }}
        />

        <Typography variant="h4" gutterBottom>
          Composition des Équipes
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Composez les équipes pour une journée de championnat.
        </Typography>

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
        />

        <CompositionRulesHelp rules={compositionRules} />

        <CompositionToolbar
          canCopyDefaultsButton={canCopyDefaultsButton}
          canResetButton={canResetButton}
          onApplyDefaultsClick={handleApplyDefaultsClick}
          onResetClick={handleResetButtonClick}
        />

        {selectedJournee && (isParis || selectedPhase) ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              {!isParis && (
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="Équipes Masculines" />
                  <Tab label="Équipes Féminines" />
                </Tabs>
              )}
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
                  const phase = (selectedPhase || "aller") as
                    | "aller"
                    | "retour";
                  const championshipType =
                    tabValue === 0 ? "masculin" : "feminin";
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
              />

              <Box sx={{ flex: 1 }}>
                <CompositionsSummary
                  totalTeams={compositionSummary.totalEditable}
                  completedTeams={compositionSummary.equipesCompletes}
                  incompleteTeams={compositionSummary.equipesIncompletes}
                  invalidTeams={compositionSummary.equipesInvalides}
                  matchesPlayed={compositionSummary.equipesMatchsJoues}
                  percentage={compositionSummary.percentage}
                  discordMessagesSent={(() => {
                    const currentTypeEquipes = isParis
                      ? [...equipesByType.masculin, ...equipesByType.feminin]
                      : tabValue === 0
                      ? equipesByType.masculin
                      : equipesByType.feminin;
                    return currentTypeEquipes.filter((equipe) => {
                      const match = getMatchForTeam(equipe);
                      const matchPlayed = isMatchPlayed(match);
                      return (
                        !matchPlayed &&
                        discordSentStatus[equipe.team.id]?.sent === true
                      );
                    }).length;
                  })()}
                  discordMessagesTotal={(() => {
                    const currentTypeEquipes = isParis
                      ? [...equipesByType.masculin, ...equipesByType.feminin]
                      : tabValue === 0
                      ? equipesByType.masculin
                      : equipesByType.feminin;
                    return currentTypeEquipes.filter((equipe) => {
                      const match = getMatchForTeam(equipe);
                      return !isMatchPlayed(match);
                    }).length;
                  })()}
                />

                <CompositionTabPanel
                  value={tabValue}
                  index={0}
                  prefix="compositions"
                >
                  {(() => {
                    // Pour le championnat de Paris, afficher toutes les équipes (masculin + féminin)
                    const equipesToDisplay = isParis
                      ? [...equipesByType.masculin, ...equipesByType.feminin]
                      : equipesByType.masculin;

                    return (
                      <CompositionTeamList
                        equipes={equipesToDisplay}
                        players={players}
                        compositions={compositions}
                        selectedEpreuve={selectedEpreuve}
                        selectedJournee={selectedJournee}
                        selectedPhase={selectedPhase}
                        tabValue={tabValue}
                        isParis={isParis}
                        draggedPlayerId={draggedPlayerId}
                        dragOverTeamId={dragOverTeamId}
                        teamValidationErrors={teamValidationErrors}
                        availabilities={availabilities}
                        mode="daily"
                        onRemovePlayer={handleRemovePlayer}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        formatMatchInfo={formatMatchInfo}
                        showMatchInfo={showMatchInfo}
                        setShowMatchInfo={setShowMatchInfo}
                        discordSentStatus={discordSentStatus}
                        customMessages={customMessages}
                        setCustomMessages={setCustomMessages}
                        handleSaveCustomMessage={handleSaveCustomMessage}
                        handleSendDiscordMessage={handleSendDiscordMessage}
                        setConfirmResendDialog={setConfirmResendDialog}
                        discordChannels={discordChannels}
                        discordMembers={discordMembers}
                        saveTimeoutRef={saveTimeoutRef}
                      />
                    );
                  })()}
                </CompositionTabPanel>

                <CompositionTabPanel
                  value={tabValue}
                  index={1}
                  prefix="compositions"
                >
                  <CompositionTeamList
                    equipes={equipesByType.feminin}
                    players={players}
                    compositions={compositions}
                    selectedEpreuve={selectedEpreuve}
                    selectedJournee={selectedJournee}
                    selectedPhase={selectedPhase}
                    tabValue={tabValue}
                    isParis={isParis}
                    draggedPlayerId={draggedPlayerId}
                    dragOverTeamId={dragOverTeamId}
                    teamValidationErrors={teamValidationErrors}
                    availabilities={availabilities}
                    mode="daily"
                    onRemovePlayer={handleRemovePlayer}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    formatMatchInfo={formatMatchInfo}
                    showMatchInfo={showMatchInfo}
                    setShowMatchInfo={setShowMatchInfo}
                    discordSentStatus={discordSentStatus}
                    customMessages={customMessages}
                    setCustomMessages={setCustomMessages}
                    handleSaveCustomMessage={handleSaveCustomMessage}
                    handleSendDiscordMessage={handleSendDiscordMessage}
                    setConfirmResendDialog={setConfirmResendDialog}
                    discordChannels={discordChannels}
                    discordMembers={discordMembers}
                    saveTimeoutRef={saveTimeoutRef}
                  />
                </CompositionTabPanel>
              </Box>
            </Box>
          </>
        ) : null}

        {(!selectedJournee || !selectedPhase) && (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary" align="center">
                Veuillez sélectionner une phase et une journée pour commencer
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </AuthGuard>
  );
}
