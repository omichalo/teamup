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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tooltip,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  ContentCopy,
  RestartAlt,
  Message,
  Close,
  Send,
} from "@mui/icons-material";
import {
  useEquipesWithMatches,
  type EquipeWithMatches,
} from "@/hooks/useEquipesWithMatches";
import { useCompositionRealtime } from "@/hooks/useCompositionRealtime";
import { useAvailabilityRealtime } from "@/hooks/useAvailabilityRealtime";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { CompositionService } from "@/lib/services/composition-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { Player } from "@/types/team-management";
import { Match } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  EpreuveType,
  getIdEpreuve,
  getMatchEpreuve,
} from "@/lib/shared/epreuve-utils";
import { useChampionshipTypes } from "@/hooks/useChampionshipTypes";
import {
  getMatchForTeamAndJournee,
  getPlayersFromMatch,
  isMatchPlayed,
  extractTeamNumber,
} from "@/lib/compositions/validation";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { CompositionRulesHelp } from "@/components/compositions/CompositionRulesHelp";
import { CompositionTabPanel } from "@/components/compositions/CompositionTabPanel";
import { PlayerBurnoutIndicators } from "@/components/compositions/PlayerBurnoutIndicators";
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

// TabPanel remplacé par CompositionTabPanel

// Composant pour afficher les suggestions de mentions
function MentionSuggestions({
  members,
  query,
  anchorEl,
  onSelect,
}: {
  members: Array<{ id: string; username: string; displayName: string }>;
  query: string;
  anchorEl: HTMLElement;
  onSelect: (member: {
    id: string;
    username: string;
    displayName: string;
  }) => void;
}) {
  const filteredMembers = members
    .filter((member) => {
      const searchQuery = query.toLowerCase();
      return (
        member.displayName.toLowerCase().includes(searchQuery) ||
        member.username.toLowerCase().includes(searchQuery)
      );
    })
    .slice(0, 10); // Limiter à 10 résultats

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <Popper
      open={true}
      anchorEl={anchorEl}
      placement="bottom-start"
      sx={{ zIndex: 1300, mt: 0.5 }}
    >
      <Paper
        elevation={8}
        sx={{
          maxHeight: 300,
          overflow: "auto",
          minWidth: 280,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <List dense sx={{ py: 0.5 }}>
          {filteredMembers.map((member) => (
            <ListItem key={member.id} disablePadding>
              <ListItemButton
                onMouseDown={(e) => {
                  // Empêcher le onBlur du TextField de se déclencher
                  e.preventDefault();
                }}
                onClick={() => {
                  onSelect(member);
                }}
                sx={{
                  borderRadius: 1,
                  mx: 0.5,
                  my: 0.25,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    mr: 1.5,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {member.displayName.charAt(0).toUpperCase()}
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {member.displayName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      @{member.username}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Popper>
  );
}

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType | null>(
    null
  );
  const { loadBoth, createEmpty, isParisChampionship } = useChampionshipTypes();

  // Calculer isParis une fois pour éviter les appels répétés
  const isParis = useMemo(
    () => isParisChampionship(selectedEpreuve),
    [isParisChampionship, selectedEpreuve]
  );
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    null
  );
  const [tabValue, setTabValue] = useState(0); // 0 = masculin, 1 = féminin
  // État pour stocker les compositions : Map<teamId, playerIds[]>
  const [compositions, setCompositions] = useState<Record<string, string[]>>(
    {}
  );
  // draggedPlayerId et dragOverTeamId sont maintenant gérés par useCompositionDragDrop
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
  // teamValidationErrors est maintenant géré par useCompositionValidation
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] =
    useState(false);
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);
  // État pour gérer l'affichage du message d'informations du match par équipe
  const [showMatchInfo, setShowMatchInfo] = useState<Record<string, boolean>>(
    {}
  );
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [sendingDiscord, setSendingDiscord] = useState<Record<string, boolean>>(
    {}
  );
  const [discordSentStatus, setDiscordSentStatus] = useState<
    Record<string, { sent: boolean; sentAt?: string; customMessage?: string }>
  >({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>(
    {}
  );
  const [confirmResendDialog, setConfirmResendDialog] = useState<{
    open: boolean;
    teamId: string | null;
    matchInfo: string | null;
    channelId?: string;
  }>({ open: false, teamId: null, matchInfo: null });
  const [discordMembers, setDiscordMembers] = useState<
    Array<{ id: string; username: string; displayName: string }>
  >([]);
  const [discordChannels, setDiscordChannels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [mentionAnchor, setMentionAnchor] = useState<{
    teamId: string;
    anchorEl: HTMLElement;
    startPos: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const saveTimeoutRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // getDiscordStatus est maintenant importé depuis @/lib/compositions/discord-utils

  const playerService = useMemo(() => new FirestorePlayerService(), []);
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

  // Extraire les journées depuis les matchs, groupées par épreuve et phase avec leurs dates
  // Utiliser toutes les équipes (pas filteredEquipes) pour calculer defaultEpreuve correctement
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

    equipes.forEach((equipe) => {
      equipe.matches.forEach((match) => {
        const epreuve = getMatchEpreuve(match, equipe.team);

        if (!epreuve || !match.journee || !match.phase) {
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

    return journeesMap;
  }, [equipes]);

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

  // Charger les membres Discord pour l'autocomplete
  useEffect(() => {
    const loadDiscordMembers = async () => {
      try {
        console.log("[Compositions] Chargement des membres Discord...");
        const response = await fetch("/api/discord/members", {
          method: "GET",
          credentials: "include",
        });
        console.log("[Compositions] Réponse status:", response.status);
        if (response.ok) {
          const result = await response.json();
          console.log("[Compositions] Résultat:", result);
          if (result.success) {
            console.log(
              "[Compositions] Membres reçus:",
              result.members?.length || 0
            );
            setDiscordMembers(result.members || []);
          } else {
            console.error(
              "[Compositions] Erreur dans la réponse:",
              result.error
            );
          }
        } else {
          const errorText = await response.text();
          console.error(
            "[Compositions] Erreur HTTP:",
            response.status,
            errorText
          );
        }
      } catch (error) {
        console.error(
          "[Compositions] Erreur lors du chargement des membres Discord:",
          error
        );
      } finally {
      }
    };
    void loadDiscordMembers();
  }, []);

  // Charger les canaux Discord
  useEffect(() => {
    const loadDiscordChannels = async () => {
      try {
        const response = await fetch("/api/discord/channels", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setDiscordChannels(result.channels || []);
          } else {
            console.error(
              "Erreur lors du chargement des canaux Discord:",
              result.error
            );
          }
        } else {
          const errorData = await response.json();
          console.error(
            "Erreur HTTP lors du chargement des canaux Discord:",
            errorData
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des canaux Discord:", error);
      }
    };
    void loadDiscordChannels();
  }, []);

  const [availabilities, setAvailabilities] = useState<{
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  }>({});

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
  const availablePlayers = useMemo(() => {
    if (selectedJournee === null || selectedPhase === null) {
      return [];
    }

    // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
    const championshipType = isParis
      ? "masculin"
      : tabValue === 0
      ? "masculin"
      : "feminin";
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
  }, [
    players,
    availabilities,
    tabValue,
    selectedJournee,
    selectedPhase,
    isParis,
  ]);

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

  // Vérifier le statut d'envoi des messages Discord
  useEffect(() => {
    const checkDiscordStatus = async () => {
      if (!selectedJournee || !selectedPhase) return;

      const allTeams = [...equipesByType.masculin, ...equipesByType.feminin];
      if (allTeams.length === 0) return;

      // Un seul appel API pour toutes les équipes
      const teamIds = allTeams.map((equipe) => equipe.team.id).join(",");
      try {
        const response = await fetch(
          `/api/discord/check-message-sent?teamIds=${encodeURIComponent(
            teamIds
          )}&journee=${selectedJournee}&phase=${encodeURIComponent(
            selectedPhase
          )}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.results) {
            const statusMap: Record<
              string,
              { sent: boolean; sentAt?: string; customMessage?: string }
            > = {};
            const customMessagesMap: Record<string, string> = {};

            Object.entries(result.results).forEach(([teamId, status]) => {
              const statusData = status as {
                sent: boolean;
                sentAt?: string;
                customMessage?: string;
              };
              statusMap[teamId] = statusData;
              if (statusData.customMessage) {
                customMessagesMap[teamId] = statusData.customMessage;
              }
            });

            setDiscordSentStatus(statusMap);
            setCustomMessages((prev) => ({ ...prev, ...customMessagesMap }));
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification du statut Discord:",
          error
        );
      }
    };

    void checkDiscordStatus();
  }, [
    selectedJournee,
    selectedPhase,
    equipesByType.masculin,
    equipesByType.feminin,
  ]);

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

  // Fonction pour sauvegarder le message personnalisé
  const handleSaveCustomMessage = useCallback(
    async (
      teamId: string,
      customMessage: string,
      journee: number | null,
      phase: string | null
    ) => {
      if (!journee || !phase) return;

      try {
        const response = await fetch("/api/discord/update-custom-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            teamId,
            journee,
            phase,
            customMessage,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Mettre à jour l'état local
            setCustomMessages((prev) => ({ ...prev, [teamId]: customMessage }));
            setDiscordSentStatus((prev) => ({
              ...prev,
              [teamId]: { ...prev[teamId], customMessage },
            }));
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde du message personnalisé:",
          error
        );
      }
    },
    []
  );

  // Fonction pour insérer une mention dans le message
  const insertMention = useCallback(
    (
      teamId: string,
      startPos: number,
      member: { id: string; displayName: string; username: string }
    ) => {
      setCustomMessages((prev) => {
        const currentMessage = prev[teamId] || "";
        const textBeforeAt = currentMessage.substring(0, startPos);
        const textAfterAt = currentMessage.substring(startPos);
        // Trouver où se termine la partie à remplacer (jusqu'au prochain espace, saut de ligne ou fin)
        const match = textAfterAt.match(/^@[^\s\n]*/);
        const endPos = startPos + (match ? match[0].length : 1);
        const textAfterMention = currentMessage.substring(endPos);

        const mention = `<@${member.id}>`;
        const newMessage = textBeforeAt + mention + textAfterMention;

        // Sauvegarder immédiatement après l'insertion
        if (selectedJournee && selectedPhase) {
          handleSaveCustomMessage(
            teamId,
            newMessage,
            selectedJournee,
            selectedPhase
          );
        }

        return { ...prev, [teamId]: newMessage };
      });
      setMentionAnchor(null);
    },
    [selectedJournee, selectedPhase, handleSaveCustomMessage]
  );

  // Fonction pour formater le message d'informations du match
  const formatMatchInfo = useCallback(
    (
      match: Match | null,
      teamPlayers: Player[],
      teamLocationId?: string,
      teamName?: string,
      isFemale?: boolean,
      epreuve?: EpreuveType | null
    ) => {
      if (!match) return null;

      const dayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      const matchDate =
        match.date instanceof Date ? match.date : new Date(match.date);
      const dayName = dayNames[matchDate.getDay()];

      // Nettoyer le nom de l'équipe et ajouter "F" pour les équipes féminines
      let cleanName = teamName ? cleanTeamName(teamName) : "";
      if (isFemale && cleanName && !cleanName.endsWith("F")) {
        cleanName = `${cleanName}F`;
      }
      const division = formatDivision(match.division || "");
      const opponent = match.opponent || match.opponentClub || "";

      // Utiliser le lieu de l'équipe (résoudre l'ID en nom depuis la collection locations)
      // Ne jamais utiliser match.location car il peut contenir des données incorrectes
      // On n'affiche rien si le lieu n'est pas trouvé dans la liste des locations
      let location = "";
      if (teamLocationId) {
        const teamLocation = locations.find((l) => l.id === teamLocationId);
        if (teamLocation) {
          location = teamLocation.name;
        }
        // Si le lieu n'est pas trouvé, on laisse location vide (on n'affiche rien)
      }

      const isHome = match.isHome ? "Domicile" : "Extérieur";

      // Pour le championnat de Paris, grouper les joueurs et ajouter le numéro de groupe
      // Utiliser isParisChampionship depuis le hook au lieu de vérifier epreuve directement
      const isParisMatch = epreuve === "championnat_paris";
      let playersList: string;

      if (isParisMatch) {
        // Trier les joueurs par points décroissants
        const sortedPlayers = [...teamPlayers].sort((a, b) => {
          const pointsA = a.points ?? 0;
          const pointsB = b.points ?? 0;
          return pointsB - pointsA; // Décroissant
        });

        // Grouper par 3 et ajouter le numéro de groupe
        const playersWithGroups: string[] = [];
        for (let i = 0; i < sortedPlayers.length; i += 3) {
          const groupNumber = Math.floor(i / 3) + 1;
          const group = sortedPlayers.slice(i, i + 3);
          group.forEach((player) => {
            playersWithGroups.push(
              `🔹 ${player.firstName} ${player.name} (Groupe ${groupNumber})`
            );
          });
        }
        playersList = playersWithGroups.join("\n");
      } else {
        // Pour les autres championnats, affichage normal
        playersList = teamPlayers
          .map((p) => `🔹 ${p.firstName} ${p.name}`)
          .join("\n");
      }

      // Collecter toutes les mentions Discord de tous les joueurs
      // Filtrer uniquement les mentions qui correspondent à des membres existants sur le serveur
      const allDiscordMentions: string[] = [];
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      teamPlayers.forEach((player) => {
        if (player.discordMentions && player.discordMentions.length > 0) {
          // Ajouter uniquement les mentions valides (format <@USER_ID>)
          player.discordMentions.forEach((mentionId) => {
            // Vérifier que l'ID existe encore dans la liste des membres Discord
            if (validMemberIds.has(mentionId)) {
              allDiscordMentions.push(`<@${mentionId}>`);
            }
          });
        }
      });

      // Construire le message avec les mentions Discord si elles existent
      const parts = [
        `${cleanName} – ${division} – ${opponent}`,
        location,
        `${dayName} – ${isHome}`,
        playersList,
      ];

      // Ajouter les mentions Discord après la liste des joueurs
      if (allDiscordMentions.length > 0) {
        parts.push(allDiscordMentions.join(" "));
      }

      return parts.filter(Boolean).join("\n");
    },
    [locations, discordMembers]
  );

  // Fonction pour envoyer le message Discord
  const handleSendDiscordMessage = useCallback(
    async (
      teamId: string,
      content: string,
      journee: number | null,
      phase: string | null,
      channelId?: string
    ) => {
      if (!journee || !phase) return;

      setSendingDiscord((prev) => ({ ...prev, [teamId]: true }));
      try {
        const customMessage = customMessages[teamId] || "";
        const response = await fetch("/api/discord/send-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content,
            teamId,
            journee,
            phase,
            customMessage,
            channelId,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Mettre à jour le statut local
            setDiscordSentStatus((prev) => {
              const existing = prev[teamId];
              const newStatus: {
                sent: boolean;
                sentAt: string;
                customMessage?: string;
              } = {
                sent: true,
                sentAt: new Date().toISOString(),
                ...(customMessage || existing?.customMessage
                  ? {
                      customMessage:
                        customMessage || existing?.customMessage || "",
                    }
                  : {}),
              };
              return {
                ...prev,
                [teamId]: newStatus,
              };
            });
          } else {
            const error = await response.json();
            alert(
              `Erreur lors de l'envoi: ${error.error || "Erreur inconnue"}`
            );
          }
        } else {
          const error = await response.json();
          alert(`Erreur lors de l'envoi: ${error.error || "Erreur inconnue"}`);
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message Discord:", error);
        alert("Erreur lors de l'envoi du message Discord");
      } finally {
        setSendingDiscord((prev) => ({ ...prev, [teamId]: false }));
      }
    },
    [customMessages]
  );

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

        teamIds.forEach((teamId) => {
          const defaultPlayers = defaultsForType[teamId] || [];
          const nextTeamPlayers: string[] = [];

          defaultPlayers.forEach((playerId) => {
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

            if (nextTeamPlayers.length >= 5) {
              console.log("[Compositions] Player skipped (team full)", {
                playerId,
                teamId,
                championshipType,
              });
              return;
            }

            const maxMasculine =
              player.highestMasculineTeamNumberByPhase?.[
                selectedPhase || "aller"
              ];
            const maxFeminine =
              player.highestFeminineTeamNumberByPhase?.[
                selectedPhase || "aller"
              ];
            const teamNumber = extractTeamNumber(
              filteredEquipes.find((eq) => eq.team.id === teamId)?.team.name ||
                ""
            );

            if (
              teamNumber > 0 &&
              ((championshipType === "masculin" &&
                maxMasculine !== undefined &&
                maxMasculine !== null &&
                teamNumber > maxMasculine) ||
                (championshipType === "feminin" &&
                  maxFeminine !== undefined &&
                  maxFeminine !== null &&
                  teamNumber > maxFeminine))
            ) {
              console.log("[Compositions] Player skipped (burning rule)", {
                playerId,
                teamId,
                championshipType,
                phase: selectedPhase,
                journee: selectedJournee,
                maxMasculine,
                maxFeminine,
              });
              return;
            }

            nextTeamPlayers.push(playerId);
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
    equipesByType,
    hasDefaultCompositions,
    isApplyingDefaults,
    players,
    selectedJournee,
    selectedPhase,
    filteredEquipes,
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
          <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="epreuve-select-label">Épreuve</InputLabel>
                <Select
                  labelId="epreuve-select-label"
                  id="epreuve-select"
                  value={selectedEpreuve || ""}
                  label="Épreuve"
                  onChange={(e) => {
                    const epreuve = e.target.value as EpreuveType;
                    setSelectedEpreuve(epreuve);
                    setSelectedPhase(null); // Réinitialiser la phase lors du changement d'épreuve
                    setSelectedJournee(null); // Réinitialiser la journée lors du changement d'épreuve
                  }}
                >
                  <MenuItem value="championnat_equipes">
                    Championnat par Équipes
                  </MenuItem>
                  <MenuItem value="championnat_paris">
                    Championnat de Paris IDF
                  </MenuItem>
                </Select>
              </FormControl>
              {/* Masquer le sélecteur de phase pour le championnat de Paris (une seule phase) */}
              {!isParis && (
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
                    disabled={selectedEpreuve === null}
                  >
                    <MenuItem value="aller">Phase Aller</MenuItem>
                    <MenuItem value="retour">Phase Retour</MenuItem>
                  </Select>
                </FormControl>
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
                    (isParis ? false : selectedPhase === null) ||
                    selectedEpreuve === null
                  }
                >
                  {(() => {
                    // Pour le championnat de Paris, utiliser "aller" comme phase
                    const phaseToUse = isParis ? "aller" : selectedPhase;

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
                      });
                  })()}
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        <CompositionRulesHelp rules={compositionRules} />

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

                    if (equipesToDisplay.length === 0) {
                      return (
                        <Typography variant="body2" color="text.secondary">
                          {isParis
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

                          // Pour le championnat de Paris, utiliser les disponibilités "masculin" (mixte)
                          const teamAvailabilityMap = isParis
                            ? availabilities.masculin || {}
                            : availabilities.masculin || {};

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
                                  willBeBurned: false,
                                };
                          const canDrop = matchPlayed
                            ? false
                            : dropCheck.canAssign;

                          // Construire le message de dropReason (sans l'information de brûlage lors du drag)
                          // L'information de brûlage sera affichée uniquement si le joueur est déjà dans l'équipe
                          const dropReasonWithBurning = dropCheck.reason;
                          const dragHandlers = matchPlayed
                            ? undefined
                            : {
                                onDragOver: (event: React.DragEvent) =>
                                  handleDragOver(event, equipe.team.id),
                                onDragLeave: handleDragLeave,
                                onDrop: (event: React.DragEvent) =>
                                  handleDrop(event, equipe.team.id),
                              };
                          const validationInfo =
                            !matchPlayed &&
                            selectedJournee !== null &&
                            selectedPhase !== null
                              ? teamValidationErrors[equipe.team.id]
                              : undefined;
                          const validationError = validationInfo?.reason;
                          const offendingPlayerIds =
                            validationInfo?.offendingPlayerIds ?? [];

                          const isFemaleTeam = equipe.matches.some(
                            (match) => match.isFemale === true
                          );
                          const matchInfo = formatMatchInfo(
                            match,
                            teamPlayersData,
                            equipe.team.location,
                            equipe.team.name,
                            isFemaleTeam,
                            selectedEpreuve
                          );

                          return (
                            <Box
                              key={equipe.team.id}
                              sx={{
                                display: "flex",
                                gap: 2,
                                alignItems: "flex-start",
                                mb: 2,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <TeamCompositionCard
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
                                  dropReason={dropReasonWithBurning}
                                  draggedPlayerId={draggedPlayerId}
                                  dragOverTeamId={dragOverTeamId}
                                  matchPlayed={matchPlayed}
                                  selectedEpreuve={selectedEpreuve}
                                  maxPlayers={getMaxPlayersForTeam(equipe)}
                                  additionalHeader={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      {validationError && (
                                        <Chip
                                          label="Invalide"
                                          size="small"
                                          color="error"
                                          variant="filled"
                                        />
                                      )}
                                      {matchInfo && !matchPlayed && (
                                        <Tooltip
                                          title={
                                            !equipe.team.discordChannelId
                                              ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                                              : showMatchInfo[equipe.team.id]
                                              ? "Masquer le message"
                                              : "Afficher le message"
                                          }
                                        >
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                setShowMatchInfo((prev) => ({
                                                  ...prev,
                                                  [equipe.team.id]:
                                                    !prev[equipe.team.id],
                                                }));
                                              }}
                                              disabled={
                                                !equipe.team.discordChannelId
                                              }
                                              color={
                                                showMatchInfo[equipe.team.id]
                                                  ? "primary"
                                                  : "default"
                                              }
                                            >
                                              <Message fontSize="small" />
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  }
                                  renderPlayerIndicators={(player) => {
                                    const phase = selectedPhase || "aller";
                                    // Pour le championnat de Paris, utiliser "masculin" comme type par défaut (mixte)
                                    const championshipType = isParis
                                      ? "masculin"
                                      : tabValue === 0
                                      ? "masculin"
                                      : "feminin";
                                    return (
                                      <PlayerBurnoutIndicators
                                        player={player}
                                        equipe={equipe}
                                        phase={phase}
                                        championshipType={championshipType}
                                        isParis={isParis}
                                        teamAvailabilityMap={
                                          teamAvailabilityMap
                                        }
                                        offendingPlayerIds={offendingPlayerIds}
                                        validationError={validationError}
                                        discordMembers={discordMembers}
                                      />
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
                              {matchInfo &&
                                !matchPlayed &&
                                showMatchInfo[equipe.team.id] && (
                                  <Card
                                    elevation={2}
                                    sx={{
                                      minWidth: 300,
                                      maxWidth: 400,
                                      borderLeft: "4px solid",
                                      borderLeftColor: "primary.main",
                                      backgroundColor: "action.hover",
                                      position: "relative",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        p: 1,
                                        pb: 0.5,
                                        borderBottom: "1px solid",
                                        borderBottomColor: "divider",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Message
                                          fontSize="small"
                                          color="primary"
                                        />
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.25,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500 }}
                                          >
                                            Message Discord
                                          </Typography>
                                          {equipe.team.discordChannelId && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{
                                                fontSize: "0.7rem",
                                                fontStyle: "italic",
                                              }}
                                            >
                                              Canal: #
                                              {discordChannels.find(
                                                (c) =>
                                                  c.id ===
                                                  equipe.team.discordChannelId
                                              )?.name || "Canal configuré"}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          {discordSentStatus[equipe.team.id]
                                            ?.sent && (
                                            <Chip
                                              label="Envoyé"
                                              size="small"
                                              color="success"
                                              variant="outlined"
                                              sx={{
                                                height: 20,
                                                fontSize: "0.65rem",
                                              }}
                                              title={
                                                discordSentStatus[
                                                  equipe.team.id
                                                ]?.sentAt
                                                  ? `Envoyé le ${new Date(
                                                      discordSentStatus[
                                                        equipe.team.id
                                                      ].sentAt!
                                                    ).toLocaleString("fr-FR")}`
                                                  : "Message déjà envoyé"
                                              }
                                            />
                                          )}
                                          <Tooltip
                                            title={
                                              !equipe.team.discordChannelId
                                                ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                                                : discordSentStatus[
                                                    equipe.team.id
                                                  ]?.sent
                                                ? "Renvoyer le message sur Discord"
                                                : "Envoyer le message sur Discord"
                                            }
                                          >
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={() => {
                                                  if (!matchInfo) return;
                                                  if (
                                                    discordSentStatus[
                                                      equipe.team.id
                                                    ]?.sent
                                                  ) {
                                                    setConfirmResendDialog({
                                                      open: true,
                                                      teamId: equipe.team.id,
                                                      matchInfo,
                                                      ...(equipe.team
                                                        .discordChannelId
                                                        ? {
                                                            channelId:
                                                              equipe.team
                                                                .discordChannelId,
                                                          }
                                                        : {}),
                                                    });
                                                  } else {
                                                    handleSendDiscordMessage(
                                                      equipe.team.id,
                                                      matchInfo,
                                                      selectedJournee,
                                                      selectedPhase,
                                                      equipe.team
                                                        .discordChannelId
                                                    );
                                                  }
                                                }}
                                                disabled={
                                                  sendingDiscord[
                                                    equipe.team.id
                                                  ] ||
                                                  !matchInfo ||
                                                  !equipe.team.discordChannelId
                                                }
                                                sx={{ p: 0.5 }}
                                                color={
                                                  discordSentStatus[
                                                    equipe.team.id
                                                  ]?.sent
                                                    ? "warning"
                                                    : "primary"
                                                }
                                              >
                                                {sendingDiscord[
                                                  equipe.team.id
                                                ] ? (
                                                  <CircularProgress size={16} />
                                                ) : (
                                                  <Send fontSize="small" />
                                                )}
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            setShowMatchInfo((prev) => ({
                                              ...prev,
                                              [equipe.team.id]: false,
                                            }));
                                          }}
                                          sx={{ p: 0.5 }}
                                          title="Fermer le message"
                                        >
                                          <Close fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                    <CardContent
                                      sx={{ pt: 1.5, pb: "16px !important" }}
                                    >
                                      <Typography
                                        variant="body2"
                                        component="pre"
                                        sx={{
                                          whiteSpace: "pre-wrap",
                                          fontFamily: "monospace",
                                          fontSize: "0.75rem",
                                          lineHeight: 1.8,
                                          m: 0,
                                          mb: 2,
                                          color: "text.primary",
                                        }}
                                      >
                                        {matchInfo}
                                      </Typography>
                                      <Box sx={{ mt: 1, position: "relative" }}>
                                        <TextField
                                          label="Message personnalisé (optionnel)"
                                          multiline
                                          rows={3}
                                          fullWidth
                                          value={
                                            customMessages[equipe.team.id] || ""
                                          }
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const cursorPos =
                                              e.target.selectionStart || 0;

                                            // Détecter si on tape "@" ou si on est en train de taper après "@"
                                            const textBeforeCursor =
                                              value.substring(0, cursorPos);
                                            const lastAtIndex =
                                              textBeforeCursor.lastIndexOf("@");

                                            if (lastAtIndex !== -1) {
                                              // Vérifier qu'il n'y a pas d'espace entre "@" et le curseur
                                              const textAfterAt =
                                                textBeforeCursor.substring(
                                                  lastAtIndex + 1
                                                );
                                              if (
                                                !textAfterAt.includes(" ") &&
                                                !textAfterAt.includes("\n")
                                              ) {
                                                // On est en train de taper une mention
                                                const query =
                                                  textAfterAt.toLowerCase();
                                                setMentionQuery(query);
                                                setMentionAnchor({
                                                  teamId: equipe.team.id,
                                                  anchorEl: e.target,
                                                  startPos: lastAtIndex,
                                                });
                                              } else {
                                                setMentionAnchor(null);
                                              }
                                            } else {
                                              setMentionAnchor(null);
                                            }

                                            setCustomMessages((prev) => ({
                                              ...prev,
                                              [equipe.team.id]: value,
                                            }));

                                            // Debounce pour sauvegarder automatiquement après 1 seconde d'inactivité
                                            if (
                                              saveTimeoutRef.current[
                                                equipe.team.id
                                              ]
                                            ) {
                                              clearTimeout(
                                                saveTimeoutRef.current[
                                                  equipe.team.id
                                                ]
                                              );
                                            }
                                            saveTimeoutRef.current[
                                              equipe.team.id
                                            ] = setTimeout(() => {
                                              if (
                                                selectedJournee &&
                                                selectedPhase
                                              ) {
                                                handleSaveCustomMessage(
                                                  equipe.team.id,
                                                  value,
                                                  selectedJournee,
                                                  selectedPhase
                                                );
                                              }
                                            }, 1000);
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              mentionAnchor &&
                                              mentionAnchor.teamId ===
                                                equipe.team.id
                                            ) {
                                              const filteredMembers =
                                                discordMembers.filter(
                                                  (member) => {
                                                    const query =
                                                      mentionQuery.toLowerCase();
                                                    return (
                                                      member.displayName
                                                        .toLowerCase()
                                                        .includes(query) ||
                                                      member.username
                                                        .toLowerCase()
                                                        .includes(query)
                                                    );
                                                  }
                                                );

                                              if (
                                                e.key === "ArrowDown" ||
                                                e.key === "ArrowUp" ||
                                                e.key === "Enter" ||
                                                e.key === "Escape"
                                              ) {
                                                e.preventDefault();
                                                if (e.key === "Escape") {
                                                  setMentionAnchor(null);
                                                } else if (
                                                  e.key === "Enter" &&
                                                  filteredMembers.length > 0
                                                ) {
                                                  // Insérer la première mention
                                                  const selectedMember =
                                                    filteredMembers[0];
                                                  insertMention(
                                                    equipe.team.id,
                                                    mentionAnchor.startPos,
                                                    selectedMember
                                                  );
                                                }
                                              }
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Ne pas fermer si on clique sur une suggestion
                                            // Le onMouseDown de la suggestion empêchera le blur
                                            const relatedTarget =
                                              e.relatedTarget as HTMLElement | null;
                                            if (
                                              relatedTarget &&
                                              relatedTarget.closest(
                                                '[role="listbox"]'
                                              )
                                            ) {
                                              return;
                                            }

                                            // Délai pour permettre le clic sur une suggestion
                                            setTimeout(() => {
                                              setMentionAnchor(null);
                                              handleSaveCustomMessage(
                                                equipe.team.id,
                                                customMessages[
                                                  equipe.team.id
                                                ] || "",
                                                selectedJournee,
                                                selectedPhase
                                              );
                                            }, 200);
                                          }}
                                          placeholder="Tapez @ pour mentionner un membre Discord..."
                                          size="small"
                                          helperText="Tapez @ suivi du nom d'un membre pour le mentionner"
                                        />
                                        {mentionAnchor &&
                                          mentionAnchor.teamId ===
                                            equipe.team.id && (
                                            <MentionSuggestions
                                              members={discordMembers}
                                              query={mentionQuery}
                                              anchorEl={mentionAnchor.anchorEl}
                                              onSelect={(member) => {
                                                insertMention(
                                                  equipe.team.id,
                                                  mentionAnchor.startPos,
                                                  member
                                                );
                                              }}
                                            />
                                          )}
                                      </Box>
                                    </CardContent>
                                  </Card>
                                )}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </CompositionTabPanel>

                <CompositionTabPanel
                  value={tabValue}
                  index={1}
                  prefix="compositions"
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

                        // Pour le championnat de Paris, utiliser les disponibilités "masculin" (mixte)
                        const teamAvailabilityMap = isParis
                          ? availabilities.masculin || {}
                          : availabilities.feminin || {};

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
                                willBeBurned: false,
                              };
                        const canDrop = matchPlayed
                          ? false
                          : dropCheck.canAssign;

                        // Construire le message de dropReason (sans l'information de brûlage lors du drag)
                        // L'information de brûlage sera affichée uniquement si le joueur est déjà dans l'équipe
                        const dropReasonWithBurning = dropCheck.reason;
                        const dragHandlers = matchPlayed
                          ? undefined
                          : {
                              onDragOver: (event: React.DragEvent) =>
                                handleDragOver(event, equipe.team.id),
                              onDragLeave: handleDragLeave,
                              onDrop: (event: React.DragEvent) =>
                                handleDrop(event, equipe.team.id),
                            };
                        const validationInfo =
                          !matchPlayed &&
                          selectedJournee !== null &&
                          selectedPhase !== null
                            ? teamValidationErrors[equipe.team.id]
                            : undefined;
                        const validationError = validationInfo?.reason;
                        const offendingPlayerIds =
                          validationInfo?.offendingPlayerIds ?? [];

                        const isFemaleTeam = equipe.matches.some(
                          (match) => match.isFemale === true
                        );
                        const matchInfo = formatMatchInfo(
                          match,
                          teamPlayersData,
                          equipe.team.location,
                          equipe.team.name,
                          isFemaleTeam,
                          selectedEpreuve
                        );

                        return (
                          <Box
                            key={equipe.team.id}
                            sx={{
                              display: "flex",
                              gap: 2,
                              alignItems: "flex-start",
                              mb: 2,
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <TeamCompositionCard
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
                                dropReason={dropReasonWithBurning}
                                draggedPlayerId={draggedPlayerId}
                                dragOverTeamId={dragOverTeamId}
                                matchPlayed={matchPlayed}
                                selectedEpreuve={selectedEpreuve}
                                maxPlayers={getMaxPlayersForTeam(equipe)}
                                additionalHeader={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    {validationError && (
                                      <Chip
                                        label="Invalide"
                                        size="small"
                                        color="error"
                                        variant="filled"
                                      />
                                    )}
                                    {matchInfo && !matchPlayed && (
                                      <Tooltip
                                        title={
                                          !equipe.team.discordChannelId
                                            ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                                            : showMatchInfo[equipe.team.id]
                                            ? "Masquer le message"
                                            : "Afficher le message"
                                        }
                                      >
                                        <span>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setShowMatchInfo((prev) => ({
                                                ...prev,
                                                [equipe.team.id]:
                                                  !prev[equipe.team.id],
                                              }));
                                            }}
                                            disabled={
                                              !equipe.team.discordChannelId
                                            }
                                            color={
                                              showMatchInfo[equipe.team.id]
                                                ? "primary"
                                                : "default"
                                            }
                                          >
                                            <Message fontSize="small" />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    )}
                                  </Box>
                                }
                                renderPlayerIndicators={(player) => {
                                  const phase = selectedPhase || "aller";
                                  // Pour les équipes féminines, utiliser "feminin" comme type
                                  const championshipType = "feminin";
                                  return (
                                    <PlayerBurnoutIndicators
                                      player={player}
                                      equipe={equipe}
                                      phase={phase}
                                      championshipType={championshipType}
                                      isParis={isParis}
                                      teamAvailabilityMap={teamAvailabilityMap}
                                      offendingPlayerIds={offendingPlayerIds}
                                      validationError={validationError}
                                      discordMembers={discordMembers}
                                    />
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
                            {matchInfo &&
                              !matchPlayed &&
                              showMatchInfo[equipe.team.id] && (
                                <Card
                                  elevation={2}
                                  sx={{
                                    minWidth: 300,
                                    maxWidth: 400,
                                    borderLeft: "4px solid",
                                    borderLeftColor: "primary.main",
                                    backgroundColor: "action.hover",
                                    position: "relative",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      p: 1,
                                      pb: 0.5,
                                      borderBottom: "1px solid",
                                      borderBottomColor: "divider",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Message
                                        fontSize="small"
                                        color="primary"
                                      />
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 0.25,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontWeight: 500 }}
                                        >
                                          Message Discord
                                        </Typography>
                                        {equipe.team.discordChannelId && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                              fontSize: "0.7rem",
                                              fontStyle: "italic",
                                            }}
                                          >
                                            Canal: #
                                            {discordChannels.find(
                                              (c) =>
                                                c.id ===
                                                equipe.team.discordChannelId
                                            )?.name || "Canal configuré"}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                        }}
                                      >
                                        {discordSentStatus[equipe.team.id]
                                          ?.sent && (
                                          <Chip
                                            label="Envoyé"
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                            sx={{
                                              height: 20,
                                              fontSize: "0.65rem",
                                            }}
                                            title={
                                              discordSentStatus[equipe.team.id]
                                                ?.sentAt
                                                ? `Envoyé le ${new Date(
                                                    discordSentStatus[
                                                      equipe.team.id
                                                    ].sentAt!
                                                  ).toLocaleString("fr-FR")}`
                                                : "Message déjà envoyé"
                                            }
                                          />
                                        )}
                                        <Tooltip
                                          title={
                                            !equipe.team.discordChannelId
                                              ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                                              : discordSentStatus[
                                                  equipe.team.id
                                                ]?.sent
                                              ? "Renvoyer le message sur Discord"
                                              : "Envoyer le message sur Discord"
                                          }
                                        >
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                if (!matchInfo) return;
                                                if (
                                                  discordSentStatus[
                                                    equipe.team.id
                                                  ]?.sent
                                                ) {
                                                  setConfirmResendDialog({
                                                    open: true,
                                                    teamId: equipe.team.id,
                                                    matchInfo,
                                                    ...(equipe.team
                                                      .discordChannelId
                                                      ? {
                                                          channelId:
                                                            equipe.team
                                                              .discordChannelId,
                                                        }
                                                      : {}),
                                                  });
                                                } else {
                                                  handleSendDiscordMessage(
                                                    equipe.team.id,
                                                    matchInfo,
                                                    selectedJournee,
                                                    selectedPhase,
                                                    equipe.team.discordChannelId
                                                  );
                                                }
                                              }}
                                              disabled={
                                                sendingDiscord[
                                                  equipe.team.id
                                                ] ||
                                                !matchInfo ||
                                                !equipe.team.discordChannelId
                                              }
                                              sx={{ p: 0.5 }}
                                              color={
                                                discordSentStatus[
                                                  equipe.team.id
                                                ]?.sent
                                                  ? "warning"
                                                  : "primary"
                                              }
                                            >
                                              {sendingDiscord[
                                                equipe.team.id
                                              ] ? (
                                                <CircularProgress size={16} />
                                              ) : (
                                                <Send fontSize="small" />
                                              )}
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      </Box>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setShowMatchInfo((prev) => ({
                                            ...prev,
                                            [equipe.team.id]: false,
                                          }));
                                        }}
                                        sx={{ p: 0.5 }}
                                        title="Fermer le message"
                                      >
                                        <Close fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                  <CardContent
                                    sx={{ pt: 1.5, pb: "16px !important" }}
                                  >
                                    <Typography
                                      variant="body2"
                                      component="pre"
                                      sx={{
                                        whiteSpace: "pre-wrap",
                                        fontFamily: "monospace",
                                        fontSize: "0.75rem",
                                        lineHeight: 1.8,
                                        m: 0,
                                        mb: 2,
                                        color: "text.primary",
                                      }}
                                    >
                                      {matchInfo}
                                    </Typography>
                                    <Box sx={{ mt: 1, position: "relative" }}>
                                      <TextField
                                        label="Message personnalisé (optionnel)"
                                        multiline
                                        rows={3}
                                        fullWidth
                                        value={
                                          customMessages[equipe.team.id] || ""
                                        }
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          const cursorPos =
                                            e.target.selectionStart || 0;

                                          // Détecter si on tape "@" ou si on est en train de taper après "@"
                                          const textBeforeCursor =
                                            value.substring(0, cursorPos);
                                          const lastAtIndex =
                                            textBeforeCursor.lastIndexOf("@");

                                          if (lastAtIndex !== -1) {
                                            // Vérifier qu'il n'y a pas d'espace entre "@" et le curseur
                                            const textAfterAt =
                                              textBeforeCursor.substring(
                                                lastAtIndex + 1
                                              );
                                            if (
                                              !textAfterAt.includes(" ") &&
                                              !textAfterAt.includes("\n")
                                            ) {
                                              // On est en train de taper une mention
                                              const query =
                                                textAfterAt.toLowerCase();
                                              setMentionQuery(query);
                                              setMentionAnchor({
                                                teamId: equipe.team.id,
                                                anchorEl: e.target,
                                                startPos: lastAtIndex,
                                              });
                                            } else {
                                              setMentionAnchor(null);
                                            }
                                          } else {
                                            setMentionAnchor(null);
                                          }

                                          setCustomMessages((prev) => ({
                                            ...prev,
                                            [equipe.team.id]: value,
                                          }));

                                          // Debounce pour sauvegarder automatiquement après 1 seconde d'inactivité
                                          if (
                                            saveTimeoutRef.current[
                                              equipe.team.id
                                            ]
                                          ) {
                                            clearTimeout(
                                              saveTimeoutRef.current[
                                                equipe.team.id
                                              ]
                                            );
                                          }
                                          saveTimeoutRef.current[
                                            equipe.team.id
                                          ] = setTimeout(() => {
                                            if (
                                              selectedJournee &&
                                              selectedPhase
                                            ) {
                                              handleSaveCustomMessage(
                                                equipe.team.id,
                                                value,
                                                selectedJournee,
                                                selectedPhase
                                              );
                                            }
                                          }, 1000);
                                        }}
                                        onKeyDown={(e) => {
                                          if (
                                            mentionAnchor &&
                                            mentionAnchor.teamId ===
                                              equipe.team.id
                                          ) {
                                            const filteredMembers =
                                              discordMembers.filter(
                                                (member) => {
                                                  const query =
                                                    mentionQuery.toLowerCase();
                                                  return (
                                                    member.displayName
                                                      .toLowerCase()
                                                      .includes(query) ||
                                                    member.username
                                                      .toLowerCase()
                                                      .includes(query)
                                                  );
                                                }
                                              );

                                            if (
                                              e.key === "ArrowDown" ||
                                              e.key === "ArrowUp" ||
                                              e.key === "Enter" ||
                                              e.key === "Escape"
                                            ) {
                                              e.preventDefault();
                                              if (e.key === "Escape") {
                                                setMentionAnchor(null);
                                              } else if (
                                                e.key === "Enter" &&
                                                filteredMembers.length > 0
                                              ) {
                                                // Insérer la première mention
                                                const selectedMember =
                                                  filteredMembers[0];
                                                insertMention(
                                                  equipe.team.id,
                                                  mentionAnchor.startPos,
                                                  selectedMember
                                                );
                                              }
                                            }
                                          }
                                        }}
                                        onBlur={(e) => {
                                          // Ne pas fermer si on clique sur une suggestion
                                          // Le onMouseDown de la suggestion empêchera le blur
                                          const relatedTarget =
                                            e.relatedTarget as HTMLElement | null;
                                          if (
                                            relatedTarget &&
                                            relatedTarget.closest(
                                              '[role="listbox"]'
                                            )
                                          ) {
                                            return;
                                          }

                                          // Délai pour permettre le clic sur une suggestion
                                          setTimeout(() => {
                                            setMentionAnchor(null);
                                            handleSaveCustomMessage(
                                              equipe.team.id,
                                              customMessages[equipe.team.id] ||
                                                "",
                                              selectedJournee,
                                              selectedPhase
                                            );
                                          }, 200);
                                        }}
                                        placeholder="Tapez @ pour mentionner un membre Discord..."
                                        size="small"
                                        helperText="Tapez @ suivi du nom d'un membre pour le mentionner"
                                      />
                                      {mentionAnchor &&
                                        mentionAnchor.teamId ===
                                          equipe.team.id && (
                                          <MentionSuggestions
                                            members={discordMembers}
                                            query={mentionQuery}
                                            anchorEl={mentionAnchor.anchorEl}
                                            onSelect={(member) => {
                                              insertMention(
                                                equipe.team.id,
                                                mentionAnchor.startPos,
                                                member
                                              );
                                            }}
                                          />
                                        )}
                                    </Box>
                                  </CardContent>
                                </Card>
                              )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CompositionTabPanel>
              </Box>
            </Box>
          </>
        ) : null}

        {/* Dialog de confirmation pour renvoyer le message Discord */}
        <Dialog
          open={confirmResendDialog.open}
          onClose={() =>
            setConfirmResendDialog({
              open: false,
              teamId: null,
              matchInfo: null,
            })
          }
        >
          <DialogTitle>Renvoyer le message Discord ?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Un message a déjà été envoyé pour ce match. Voulez-vous vraiment
              le renvoyer ?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() =>
                setConfirmResendDialog({
                  open: false,
                  teamId: null,
                  matchInfo: null,
                })
              }
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
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
              color="warning"
              variant="contained"
            >
              Renvoyer
            </Button>
          </DialogActions>
        </Dialog>

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
