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
  DragIndicator,
  ContentCopy,
  RestartAlt,
  Message,
  Close,
  Send,
  AlternateEmail,
  Warning,
} from "@mui/icons-material";
import {
  useEquipesWithMatches,
  type EquipeWithMatches,
} from "@/hooks/useEquipesWithMatches";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AvailabilityService } from "@/lib/services/availability-service";
import { CompositionService } from "@/lib/services/composition-service";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { Player } from "@/types/team-management";
import { Match } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import {
  JOURNEE_CONCERNEE_PAR_REGLE,
  AssignmentValidationResult,
  canAssignPlayerToTeam,
  getMatchForTeamAndJournee,
  getPlayersFromMatch,
  isMatchPlayed,
  validateTeamCompositionState,
  extractTeamNumber,
  calculateFutureBurnout,
} from "@/lib/compositions/validation";
import { AvailablePlayersPanel } from "@/components/compositions/AvailablePlayersPanel";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { createDragImage } from "@/lib/compositions/drag-utils";
import {
  CompositionRulesHelp,
  type CompositionRuleItem,
} from "@/components/compositions/CompositionRulesHelp";

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
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
}

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
  const [teamValidationErrors, setTeamValidationErrors] = useState<
    Record<
      string,
      { reason: string; offendingPlayerIds?: string[] } | undefined
    >
  >({});
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
  const [mentionAnchor, setMentionAnchor] = useState<{
    teamId: string;
    anchorEl: HTMLElement;
    startPos: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const saveTimeoutRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Fonction helper pour vérifier le statut Discord d'un joueur
  const getDiscordStatus = useCallback(
    (player: Player): "none" | "invalid" | "valid" => {
      if (!player.discordMentions || player.discordMentions.length === 0) {
        return "none";
      }
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      const hasInvalidMention = player.discordMentions.some(
        (mentionId) => !validMemberIds.has(mentionId)
      );
      return hasInvalidMention ? "invalid" : "valid";
    },
    [discordMembers]
  );

  const playerService = useMemo(() => new FirestorePlayerService(), []);
  const availabilityService = useMemo(() => new AvailabilityService(), []);
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

  const compositionRules: CompositionRuleItem[] = useMemo(
    () => [
      {
        id: "maxPlayersDaily",
        label: "Une composition de journée ne peut aligner que 4 joueurs",
        scope: "daily",
      },
      {
        id: "maxPlayersDefaults",
        label: "Une composition par défaut peut contenir jusqu'à 5 joueurs",
        scope: "defaults",
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
        label:
          "Respect du brûlage : impossible d'aligner un joueur dans une équipe de numéro inférieur",
        scope: "both",
      },
      {
        id: "fftt",
        label: "Points minimum (selon division nationale)",
        scope: "both",
      },
      {
        id: "journee2",
        label:
          "Journée 2 : au plus un joueur ayant joué la J1 dans une équipe de numéro inférieur",
        scope: "daily",
        description:
          "Cette règle ne s'applique que sur la page des compositions de journée lorsque la J2 est sélectionnée.",
      },
    ],
    []
  );

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

  const [availabilities, setAvailabilities] = useState<{
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  }>({});

  useEffect(() => {
    if (
      loadingEquipes ||
      loadingPlayers ||
      selectedPhase === null ||
      selectedJournee === null
    ) {
      setTeamValidationErrors({});
      return;
    }

    const nextErrors: Record<
      string,
      { reason: string; offendingPlayerIds?: string[] } | undefined
    > = {};

    equipes.forEach((equipe) => {
      const validation = validateTeamCompositionState({
        teamId: equipe.team.id,
        players,
        equipes,
        compositions,
        selectedPhase,
        selectedJournee,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
      });

      if (!validation.valid) {
        const errorInfo: { reason: string; offendingPlayerIds?: string[] } = {
          reason: validation.reason || "Composition invalide",
        };
        if (validation.offendingPlayerIds) {
          errorInfo.offendingPlayerIds = validation.offendingPlayerIds;
        }
        nextErrors[equipe.team.id] = errorInfo;
      }

      const championshipType = equipe.matches.some(
        (match) => match.isFemale === true
      )
        ? "feminin"
        : "masculin";
      const availabilityMap =
        (championshipType === "masculin"
          ? availabilities.masculin
          : availabilities.feminin) || {};
      const teamPlayerIds = compositions[equipe.team.id] || [];
      const unavailablePlayers = teamPlayerIds.filter((playerId) => {
        const availability = availabilityMap[playerId];
        return !availability || availability.available !== true;
      });

      if (unavailablePlayers.length > 0) {
        const unavailablePlayerNames = unavailablePlayers
          .map((playerId) => players.find((p) => p.id === playerId))
          .filter((p): p is Player => p !== undefined)
          .map((p) => `${p.firstName} ${p.name}`);

        const reasonText =
          unavailablePlayerNames.length > 0
            ? `Joueur${
                unavailablePlayerNames.length > 1 ? "s" : ""
              } indisponible${
                unavailablePlayerNames.length > 1 ? "s" : ""
              }: ${unavailablePlayerNames.join(", ")}`
            : "Un ou plusieurs joueurs de cette équipe ne sont pas disponibles.";

        const existing = nextErrors[equipe.team.id];
        if (existing) {
          const hasReason = existing.reason.includes(reasonText);
          existing.reason = hasReason
            ? existing.reason
            : `${existing.reason} • ${reasonText}`;
          existing.offendingPlayerIds = Array.from(
            new Set([
              ...(existing.offendingPlayerIds ?? []),
              ...unavailablePlayers,
            ])
          );
        } else {
          nextErrors[equipe.team.id] = {
            reason: reasonText,
            offendingPlayerIds: unavailablePlayers,
          };
        }
      }
    });

    setTeamValidationErrors(nextErrors);
  }, [
    compositions,
    equipes,
    players,
    loadingEquipes,
    loadingPlayers,
    selectedPhase,
    selectedJournee,
    availabilities,
  ]);

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
        const [masculineDefaults, feminineDefaults] = await Promise.all([
          compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
        ]);

        setDefaultCompositions({
          masculin: masculineDefaults?.teams || {},
          feminin: feminineDefaults?.teams || {},
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions({ masculin: {}, feminin: {} });
      }

      setDefaultCompositionsLoaded(true);
    };

    loadDefaults();
  }, [selectedPhase, compositionDefaultsService]);

  useEffect(() => {
    if (selectedJournee !== null && selectedPhase !== null) {
      setAvailabilitiesLoaded(false);
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
        } finally {
          setAvailabilitiesLoaded(true);
        }
      };
      loadAvailability();
    } else {
      setAvailabilities({});
      setAvailabilitiesLoaded(false);
    }
  }, [selectedJournee, selectedPhase, availabilityService]);

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

  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setCompositions({});
      return;
    }

    let isCancelled = false;
    const championshipType = tabValue === 0 ? "masculin" : "feminin";

    const loadComposition = async () => {
      try {
        const composition = await compositionService.getComposition(
          selectedJournee,
          selectedPhase,
          championshipType
        );

        if (isCancelled) {
          return;
        }

        if (composition) {
          setCompositions(composition.teams);
          return;
        }

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
            const availablePlayerIds = playerIds
              .filter((id) => availabilityMap[id]?.available === true)
              .slice(0, 4);
            return [teamId, availablePlayerIds];
          })
        );

        setCompositions(initialTeams);
      } catch (error) {
        if (!isCancelled) {
          console.error("Erreur lors du chargement des compositions:", error);
          setCompositions({});
        }
      }
    };

    loadComposition();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedJournee,
    selectedPhase,
    tabValue,
    compositionService,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilities,
    availabilitiesLoaded,
  ]);

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

  const {
    availablePlayersWithoutAssignment,
    filteredAvailablePlayersWithoutAssignment,
  } = useMemo(() => {
    const sameTypeEquipes =
      tabValue === 0 ? equipesByType.masculin : equipesByType.feminin;
    const assignedIds = new Set<string>();
    sameTypeEquipes.forEach((equipe) => {
      const assigned = compositions[equipe.team.id] || [];
      assigned.forEach((playerId) => assignedIds.add(playerId));
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
    tabValue,
    equipesByType,
    compositions,
  ]);

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
      isFemale?: boolean
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

      const playersList = teamPlayers
        .map((p) => `🔹 ${p.firstName} ${p.name}`)
        .join("\n");

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
    const currentTypeEquipes =
      tabValue === 0 ? equipesByType.masculin : equipesByType.feminin;

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
    teamValidationErrors,
  ]);

  // Fonction pour vérifier si un drop est possible
  const canDropPlayer = (
    playerId: string,
    teamId: string
  ): AssignmentValidationResult => {
    return canAssignPlayerToTeam({
      playerId,
      teamId,
      players,
      equipes,
      compositions,
      selectedPhase,
      selectedJournee,
      journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
    });
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
    const tempDiv = createDragImage(player, {
      championshipType,
      phase: (selectedPhase || "aller") as "aller" | "retour",
    });
    document.body.appendChild(tempDiv);

    // Forcer un reflow pour s'assurer que les dimensions sont calculées
    void tempDiv.offsetHeight;

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
      const validation = canDropPlayer(draggedPlayerId, teamId);
      e.dataTransfer.dropEffect = validation.canAssign ? "move" : "none";
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

    const validation = canDropPlayer(playerId, teamId);
    if (!validation.canAssign) {
      setDraggedPlayerId(null);
      return;
    }

    const isFemaleTeam = equipe.matches.some(
      (match) => match.isFemale === true
    );
    const championshipType = isFemaleTeam ? "feminin" : "masculin";

    setCompositions((prev) => {
      const latestValidation = canAssignPlayerToTeam({
        playerId,
        teamId,
        players,
        equipes,
        compositions: prev,
        selectedPhase,
        selectedJournee,
        journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
      });

      if (!latestValidation.canAssign) {
        return prev;
      }

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

      // Ajouter le joueur à la nouvelle équipe
      const newCompositions = {
        ...updatedCompositions,
        [teamId]: [...targetTeamPlayers, playerId],
      };

      setDefaultCompositions((prev) => ({
        ...prev,
        [championshipType]: newCompositions,
      }));

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

      if (championshipType) {
        setDefaultCompositions((prevDefaults) => ({
          ...prevDefaults,
          [championshipType]: newCompositions,
        }));
      }

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
              equipes.find((eq) => eq.team.id === teamId)?.team.name || ""
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
    equipes,
    equipesByType,
    hasDefaultCompositions,
    isApplyingDefaults,
    players,
    selectedJournee,
    selectedPhase,
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

        <CompositionRulesHelp rules={compositionRules} />

        {selectedJournee && selectedPhase ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Équipes Masculines" />
                <Tab label="Équipes Féminines" />
              </Tabs>
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
                  const phase = selectedPhase || "aller";
                  const championshipType =
                    tabValue === 0 ? "masculin" : "feminin";
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
                        onDragStart={(event) =>
                          handleDragStart(event, player.id)
                        }
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
                              {player.isTemporary && (
                                <Chip
                                  label="Temporaire"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                  }}
                                />
                              )}
                              {(() => {
                                const discordStatus = getDiscordStatus(player);
                                if (discordStatus === "none") {
                                  return (
                                    <Tooltip title="Aucun login Discord configuré">
                                      <Chip
                                        icon={
                                          <AlternateEmail fontSize="small" />
                                        }
                                        label="Pas Discord"
                                        size="small"
                                        color="default"
                                        variant="outlined"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.7rem",
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
                                          height: 20,
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                }
                                return null;
                              })()}
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
                    const currentTypeEquipes =
                      tabValue === 0
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
                    const currentTypeEquipes =
                      tabValue === 0
                        ? equipesByType.masculin
                        : equipesByType.feminin;
                    return currentTypeEquipes.filter((equipe) => {
                      const match = getMatchForTeam(equipe);
                      return !isMatchPlayed(match);
                    }).length;
                  })()}
                />

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

                        const teamAvailabilityMap =
                          availabilities.masculin || {};

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
                          isFemaleTeam
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
                                  const championshipType =
                                    tabValue === 0 ? "masculin" : "feminin";
                                  const burnedTeam =
                                    championshipType === "masculin"
                                      ? player
                                          .highestMasculineTeamNumberByPhase?.[
                                          phase
                                        ]
                                      : player
                                          .highestFeminineTeamNumberByPhase?.[
                                          phase
                                        ];

                                  // Calculer le brûlage futur en simulant l'ajout d'un match dans l'équipe cible
                                  const teamNumber = extractTeamNumber(
                                    equipe.team.name
                                  );
                                  const matchesByTeamByPhase =
                                    championshipType === "masculin"
                                      ? player.masculineMatchesByTeamByPhase?.[
                                          phase
                                        ]
                                      : player.feminineMatchesByTeamByPhase?.[
                                          phase
                                        ];

                                  const futureBurnedTeam =
                                    teamNumber > 0
                                      ? calculateFutureBurnout(
                                          matchesByTeamByPhase,
                                          teamNumber
                                        )
                                      : null;

                                  // Le joueur sera brûlé si :
                                  // 1. Le brûlage futur est différent du brûlage actuel (changement d'équipe brûlée)
                                  // 2. OU le joueur devient brûlé alors qu'il ne l'était pas (actuel = null/undefined, futur ≠ null)
                                  const willBeBurned =
                                    futureBurnedTeam !== null &&
                                    (burnedTeam === null ||
                                      burnedTeam === undefined ||
                                      futureBurnedTeam !== burnedTeam);

                                  const availability =
                                    teamAvailabilityMap[player.id];
                                  const isPlayerAvailable =
                                    availability?.available === true;
                                  const showUnavailableIndicator =
                                    !isPlayerAvailable;
                                  const showJ2Indicator =
                                    offendingPlayerIds.includes(player.id) &&
                                    (
                                      validationError?.toLowerCase() || ""
                                    ).includes("journée 2") &&
                                    isPlayerAvailable;
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
                                      {willBeBurned &&
                                        futureBurnedTeam !== null && (
                                          <Chip
                                            label={`Sera brûlé Éq. ${futureBurnedTeam}`}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                            }}
                                            title={
                                              burnedTeam === null ||
                                              burnedTeam === undefined
                                                ? "Ce joueur deviendra brûlé dans cette équipe"
                                                : `Ce joueur changera d'équipe brûlée (actuellement Éq. ${burnedTeam}, deviendra Éq. ${futureBurnedTeam})`
                                            }
                                          />
                                        )}
                                      {showUnavailableIndicator && (
                                        <Chip
                                          label="Indispo"
                                          size="small"
                                          color="error"
                                          variant="filled"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {showJ2Indicator && (
                                        <Chip
                                          label="J2"
                                          size="small"
                                          color="error"
                                          variant="filled"
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
                                        const discordStatus =
                                          getDiscordStatus(player);
                                        if (discordStatus === "none") {
                                          return (
                                            <Tooltip title="Aucun login Discord configuré">
                                              <Chip
                                                icon={
                                                  <AlternateEmail fontSize="small" />
                                                }
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
                                                icon={
                                                  <Warning fontSize="small" />
                                                }
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
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontWeight: 500 }}
                                      >
                                        Message Discord
                                      </Typography>
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

                        const teamAvailabilityMap =
                          availabilities.feminin || {};

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
                          isFemaleTeam
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
                                  const burnedTeam =
                                    player.highestFeminineTeamNumberByPhase?.[
                                      phase
                                    ];
                                  const availability =
                                    teamAvailabilityMap[player.id];
                                  const isPlayerAvailable =
                                    availability?.available === true;
                                  const showUnavailableIndicator =
                                    !isPlayerAvailable;
                                  const showJ2Indicator =
                                    offendingPlayerIds.includes(player.id) &&
                                    (
                                      validationError?.toLowerCase() || ""
                                    ).includes("journée 2") &&
                                    isPlayerAvailable;
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
                                      {showUnavailableIndicator && (
                                        <Chip
                                          label="Indispo"
                                          size="small"
                                          color="error"
                                          variant="filled"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                          }}
                                        />
                                      )}
                                      {showJ2Indicator && (
                                        <Chip
                                          label="J2"
                                          size="small"
                                          color="error"
                                          variant="filled"
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
                                        const discordStatus =
                                          getDiscordStatus(player);
                                        if (discordStatus === "none") {
                                          return (
                                            <Tooltip title="Aucun login Discord configuré">
                                              <Chip
                                                icon={
                                                  <AlternateEmail fontSize="small" />
                                                }
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
                                                icon={
                                                  <Warning fontSize="small" />
                                                }
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
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontWeight: 500 }}
                                      >
                                        Message Discord
                                      </Typography>
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
                </TabPanel>
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
