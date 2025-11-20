"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  FormLabel,
  Switch,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  Button,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  Popper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Search as SearchIcon,
  SportsTennis as SportsTennisIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AlternateEmail as AlternateEmailIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AuthGuard } from "@/components/AuthGuard";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import { doc, getDoc } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

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
      id={`joueurs-tabpanel-${index}`}
      aria-labelledby={`joueurs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
}

// Composant pour afficher les suggestions de mentions Discord
function MentionSuggestions({
  members,
  query,
  anchorEl,
  onSelect,
}: {
  members: Array<{ id: string; username: string; displayName: string }>;
  query: string;
  anchorEl: HTMLElement;
  onSelect: (member: { id: string; username: string; displayName: string }) => void;
}) {
  const filteredMembers = members.filter((member) => {
    const searchQuery = query.toLowerCase();
    return (
      member.displayName.toLowerCase().includes(searchQuery) ||
      member.username.toLowerCase().includes(searchQuery)
    );
  }).slice(0, 10); // Limiter à 10 résultats

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

export default function JoueursPage() {
  const { equipes, loading: loadingEquipes } = useEquipesWithMatches();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersWithoutLicense, setPlayersWithoutLicense] = useState<Player[]>(
    []
  );
  const [temporaryPlayers, setTemporaryPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState({
    gender: "",
    nationality: "",
    isActive: true,
    hasPlayedMatch: "", // "" = tous, "true" = a joué, "false" = n'a pas joué
    inChampionship: "", // "" = tous, "true" = inscrit, "false" = pas inscrit
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    firstName: "",
    name: "",
    license: "",
    gender: "M" as "M" | "F",
    nationality: "FR" as "FR" | "C" | "ETR",
    points: 500,
    inChampionship: true,
  });
  const [licenseExists, setLicenseExists] = useState(false);
  const [licenseExistsForOther, setLicenseExistsForOther] = useState(false);
  const [discordMembers, setDiscordMembers] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [discordMentions, setDiscordMentions] = useState<string[]>([]); // IDs des membres Discord sélectionnés
  const [mentionAnchor, setMentionAnchor] = useState<{ anchorEl: HTMLElement; startPos: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");

  const playerService = useMemo(() => new FirestorePlayerService(), []);

  // Déterminer la phase en cours à partir des équipes et leurs matchs
  const currentPhase = useMemo(() => {
    if (loadingEquipes || equipes.length === 0) {
      return "aller"; // Par défaut si pas de données
    }
    // Passer directement les équipes avec leurs matchs
    return getCurrentPhase(equipes);
  }, [equipes, loadingEquipes]);

  const loadPlayers = useCallback(async () => {
    try {
      setLoadingPlayers(true);
      const [activePlayers, withoutLicense, temporary] = await Promise.all([
        playerService.getActivePlayers(),
        playerService.getPlayersWithoutLicense(),
        playerService.getTemporaryPlayers(),
      ]);

      setPlayers(activePlayers);
      setPlayersWithoutLicense(withoutLicense);
      setTemporaryPlayers(temporary);
    } catch (error) {
      console.error("Erreur lors du chargement des joueurs:", error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [playerService]);

  // Charger les membres Discord
  useEffect(() => {
    const loadDiscordMembers = async () => {
      try {
        const response = await fetch("/api/discord/members", {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setDiscordMembers(result.members || []);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des membres Discord:", error);
      } finally {
      }
    };
    void loadDiscordMembers();
  }, []);

  // Calculer les joueurs filtrés pour chaque onglet (pour afficher les compteurs)
  const getFilteredCountForTab = useCallback((tabIndex: number) => {
    let sourcePlayers: Player[] = [];
    
    switch (tabIndex) {
      case 0: // Joueurs actifs
        sourcePlayers = players;
        break;
      case 1: // Sans licence
        sourcePlayers = playersWithoutLicense;
        break;
      case 2: // Temporaires
        sourcePlayers = temporaryPlayers;
        break;
      default:
        sourcePlayers = players;
    }

    let filtered = sourcePlayers;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (player) =>
          player.name.toLowerCase().includes(query) ||
          player.firstName.toLowerCase().includes(query) ||
          player.license.includes(query)
      );
    }

    // Filtres par critères
    if (filters.gender) {
      filtered = filtered.filter(
        (player) => player.gender === filters.gender
      );
    }

    if (filters.nationality) {
      filtered = filtered.filter(
        (player) => player.nationality === filters.nationality
      );
    }

    // Filtre par "a déjà joué un match"
    if (filters.hasPlayedMatch !== "") {
      const hasPlayed = filters.hasPlayedMatch === "true";
      filtered = filtered.filter(
        (player) => (player.hasPlayedAtLeastOneMatch || false) === hasPlayed
      );
    }

    // Filtre par "inscrit en championnat"
    if (filters.inChampionship !== "") {
      const inChampionship = filters.inChampionship === "true";
      filtered = filtered.filter(
        (player) =>
          (player.participation?.championnat || false) === inChampionship
      );
    }

    return filtered.length;
  }, [players, playersWithoutLicense, temporaryPlayers, searchQuery, filters]);

  const filterPlayers = useCallback(async () => {
    try {
      setSearching(true);
      let sourcePlayers: Player[] = [];

      // Sélectionner la source selon l&apos;onglet
      switch (selectedTab) {
        case 0: // Joueurs actifs
          sourcePlayers = players;
          break;
        case 1: // Sans licence
          sourcePlayers = playersWithoutLicense;
          break;
        case 2: // Temporaires
          sourcePlayers = temporaryPlayers;
          break;
        default:
          sourcePlayers = players;
      }

      let filtered = sourcePlayers;

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (player) =>
            player.name.toLowerCase().includes(query) ||
            player.firstName.toLowerCase().includes(query) ||
            player.license.includes(query)
        );
      }

      // Filtres par critères
      if (filters.gender) {
        filtered = filtered.filter(
          (player) => player.gender === filters.gender
        );
      }

      if (filters.nationality) {
        filtered = filtered.filter(
          (player) => player.nationality === filters.nationality
        );
      }

      // Filtre par "a déjà joué un match"
      if (filters.hasPlayedMatch !== "") {
        const hasPlayed = filters.hasPlayedMatch === "true";
        filtered = filtered.filter(
          (player) => (player.hasPlayedAtLeastOneMatch || false) === hasPlayed
        );
      }

      // Filtre par "inscrit en championnat"
      if (filters.inChampionship !== "") {
        const inChampionship = filters.inChampionship === "true";
        filtered = filtered.filter(
          (player) =>
            (player.participation?.championnat || false) === inChampionship
        );
      }

      setFilteredPlayers(filtered);
    } catch (error) {
      console.error("Erreur lors du filtrage des joueurs:", error);
    } finally {
      setSearching(false);
    }
  }, [
    players,
    playersWithoutLicense,
    temporaryPlayers,
    selectedTab,
    searchQuery,
    filters,
  ]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    filterPlayers();
  }, [filterPlayers]);

  const checkLicenseExists = useCallback(async (license: string, excludePlayerId?: string) => {
    if (!license.trim()) {
      setLicenseExists(false);
      setLicenseExistsForOther(false);
      return;
    }
    try {
      const exists = await playerService.checkPlayerExists(license.trim());
      // Si on est en mode édition et que la licence existe mais correspond au joueur en cours d'édition, ce n'est pas une erreur
      if (excludePlayerId && exists) {
        const playerRef = doc(getDbInstanceDirect(), "players", license.trim());
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists() && playerSnap.id === excludePlayerId) {
          setLicenseExists(false);
          setLicenseExistsForOther(false);
          return;
        }
      }
      setLicenseExists(exists);
      setLicenseExistsForOther(exists && excludePlayerId ? exists : false);
    } catch (error) {
      console.error("Erreur lors de la vérification de la licence:", error);
      setLicenseExists(false);
      setLicenseExistsForOther(false);
    }
  }, [playerService]);

  const handleCreateTemporaryPlayer = async () => {
    if (!newPlayer.firstName.trim() || !newPlayer.name.trim()) {
      alert("Le prénom et le nom sont obligatoires");
      return;
    }

    if (newPlayer.license.trim() && licenseExists) {
      alert("Un joueur avec ce numéro de licence existe déjà");
      return;
    }

    try {
      setCreating(true);
      
      // Normaliser les noms : nom en majuscules, prénom avec première lettre en majuscule
      const normalizedName = newPlayer.name.trim().toUpperCase();
      const normalizedFirstName = newPlayer.firstName.trim().charAt(0).toUpperCase() + 
        newPlayer.firstName.trim().slice(1).toLowerCase();

      await playerService.createTemporaryPlayer({
        firstName: normalizedFirstName,
        name: normalizedName,
        license: newPlayer.license.trim() || "",
        gender: newPlayer.gender,
        nationality: newPlayer.nationality,
        isActive: false,
        isTemporary: true,
        typeLicence: "",
        points: newPlayer.points || 500,
        preferredTeams: {
          masculine: [],
          feminine: [],
        },
        participation: {
          championnat: newPlayer.inChampionship,
        },
        hasPlayedAtLeastOneMatch: false,
        ...(discordMentions.length > 0 ? { discordMentions } : {}),
      });

      // Réinitialiser le formulaire
      setNewPlayer({
        firstName: "",
        name: "",
        license: "",
        gender: "M",
        nationality: "FR",
        points: 500,
        inChampionship: true,
      });
      setLicenseExists(false);
      setCreateDialogOpen(false);

      // Recharger les joueurs
      await loadPlayers();
    } catch (error) {
      console.error("Erreur lors de la création du joueur temporaire:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      if (errorMessage.includes("existe déjà")) {
        alert("Un joueur avec ce numéro de licence existe déjà");
      } else {
        alert("Erreur lors de la création du joueur temporaire");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setNewPlayer({
      firstName: player.firstName,
      name: player.name,
      license: player.license || "",
      gender: player.gender,
      nationality: player.nationality,
      points: player.points || 500,
      inChampionship: player.participation?.championnat || false,
    });
    setDiscordMentions(player.discordMentions || []);
    setLicenseExists(false);
    setLicenseExistsForOther(false);
    setEditDialogOpen(true);
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    
    // Pour les joueurs temporaires, vérifier les champs obligatoires
    if (editingPlayer.isTemporary) {
      if (!newPlayer.firstName.trim() || !newPlayer.name.trim()) {
        alert("Le prénom et le nom sont obligatoires");
        return;
      }

      if (newPlayer.license.trim() && licenseExistsForOther) {
        alert("Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant.");
        return;
      }
    }

    try {
      setUpdating(true);
      
      // Normaliser les noms
      const normalizedName = newPlayer.name.trim().toUpperCase();
      const normalizedFirstName = newPlayer.firstName.trim().charAt(0).toUpperCase() + 
        newPlayer.firstName.trim().slice(1).toLowerCase();

      // Si c'est un joueur temporaire, utiliser updateTemporaryPlayer
      if (editingPlayer.isTemporary) {
        await playerService.updateTemporaryPlayer(editingPlayer.id, {
          firstName: normalizedFirstName,
          name: normalizedName,
          license: newPlayer.license.trim() || "",
          gender: newPlayer.gender,
          nationality: newPlayer.nationality,
          isActive: false,
          isTemporary: true,
          typeLicence: editingPlayer.typeLicence || "",
          points: newPlayer.points || 500,
          preferredTeams: editingPlayer.preferredTeams || {
            masculine: [],
            feminine: [],
          },
          participation: {
            championnat: newPlayer.inChampionship,
          },
          hasPlayedAtLeastOneMatch: editingPlayer.hasPlayedAtLeastOneMatch || false,
          ...(discordMentions.length > 0 ? { discordMentions } : {}),
        });
      } else {
        // Pour les joueurs non-temporaires, utiliser updatePlayer (seulement pour les mentions Discord)
        console.log(`[JoueursPage] Mise à jour des mentions Discord pour le joueur ${editingPlayer.id}`);
        console.log(`[JoueursPage] État actuel de discordMentions:`, discordMentions);
        // Toujours passer le tableau, même s'il est vide, pour que updatePlayer puisse le gérer
        await playerService.updatePlayer(editingPlayer.id, {
          discordMentions: discordMentions,
        });
      }

      // Mettre à jour l'état local sans recharger tous les joueurs
      const updatePlayerInLists = (p: Player): Player => {
        if (p.id === editingPlayer.id) {
          const updatedPlayer: Player = {
            ...p,
            ...(discordMentions.length > 0 ? { discordMentions } : {}),
          };
          return updatedPlayer;
        }
        return p;
      };

      setPlayers(players.map(updatePlayerInLists));
      setPlayersWithoutLicense(playersWithoutLicense.map(updatePlayerInLists));
      setTemporaryPlayers(temporaryPlayers.map(updatePlayerInLists));

      // Recalculer les joueurs filtrés selon l'onglet actif
      let sourcePlayers: Player[] = [];
      switch (selectedTab) {
        case 0:
          sourcePlayers = players.map(updatePlayerInLists);
          break;
        case 1:
          sourcePlayers = playersWithoutLicense.map(updatePlayerInLists);
          break;
        case 2:
          sourcePlayers = temporaryPlayers.map(updatePlayerInLists);
          break;
        default:
          sourcePlayers = players.map(updatePlayerInLists);
      }

      // Appliquer les filtres
      let filtered = sourcePlayers;
      if (searchQuery.trim()) {
        const normalized = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            `${p.firstName} ${p.name}`.toLowerCase().includes(normalized) ||
            p.license.toLowerCase().includes(normalized)
        );
      }

      if (filters.gender) {
        filtered = filtered.filter((p) => p.gender === filters.gender);
      }

      if (filters.nationality) {
        filtered = filtered.filter((p) => p.nationality === filters.nationality);
      }

      if (filters.hasPlayedMatch !== "") {
        const hasPlayed = filters.hasPlayedMatch === "true";
        filtered = filtered.filter(
          (p) => (p.hasPlayedAtLeastOneMatch || false) === hasPlayed
        );
      }

      if (filters.inChampionship !== "") {
        const inChampionship = filters.inChampionship === "true";
        filtered = filtered.filter(
          (p) => (p.participation?.championnat || false) === inChampionship
        );
      }

      setFilteredPlayers(filtered);

      // Réinitialiser le formulaire
      setNewPlayer({
        firstName: "",
        name: "",
        license: "",
        gender: "M",
        nationality: "FR",
        points: 500,
        inChampionship: true,
      });
      setDiscordMentions([]);
      setEditingPlayer(null);
      setLicenseExists(false);
      setLicenseExistsForOther(false);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du joueur:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      if (errorMessage.includes("existe déjà")) {
        alert("Un joueur avec ce numéro de licence existe déjà");
      } else {
        alert(`Erreur lors de la mise à jour du joueur${editingPlayer?.isTemporary ? " temporaire" : ""}`);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    const confirmDelete = confirm(
      `Êtes-vous sûr de vouloir supprimer le joueur temporaire ${player.firstName} ${player.name} ?`
    );
    if (!confirmDelete) return;

    try {
      setDeleting(player.id);
      await playerService.deletePlayer(player.id);
      await loadPlayers();
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur:", error);
      alert("Erreur lors de la suppression du joueur");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleParticipation = async (
    player: Player,
    isParticipating: boolean
  ) => {
    try {
      // Mettre à jour seulement la participation au championnat
      await playerService.updatePlayer(player.id, {
        participation: {
          ...player.participation,
          championnat: isParticipating,
        },
      });
      // Mettre à jour l&apos;état local immédiatement pour un feedback visuel rapide
      const updatePlayerInList = (p: Player) =>
        p.id === player.id
          ? {
              ...p,
              participation: {
                ...p.participation,
                championnat: isParticipating,
              },
            }
          : p;

      const updatedPlayers = players.map(updatePlayerInList);
      const updatedTemporaryPlayers = temporaryPlayers.map(updatePlayerInList);
      const updatedPlayersWithoutLicense = playersWithoutLicense.map(updatePlayerInList);

      setPlayers(updatedPlayers);
      setTemporaryPlayers(updatedTemporaryPlayers);
      setPlayersWithoutLicense(updatedPlayersWithoutLicense);
      
      // Recalculer les joueurs filtrés selon l'onglet actif
      let sourcePlayers: Player[] = [];
      switch (selectedTab) {
        case 0:
          sourcePlayers = updatedPlayers;
          break;
        case 1:
          sourcePlayers = updatedPlayersWithoutLicense;
          break;
        case 2:
          sourcePlayers = updatedTemporaryPlayers;
          break;
        default:
          sourcePlayers = updatedPlayers;
      }

      // Appliquer les filtres
      let filtered = sourcePlayers;
      if (searchQuery.trim()) {
        const normalized = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            `${p.firstName} ${p.name}`.toLowerCase().includes(normalized) ||
            p.license.toLowerCase().includes(normalized)
        );
      }

      if (filters.gender) {
        filtered = filtered.filter((p) => p.gender === filters.gender);
      }

      if (filters.nationality) {
        filtered = filtered.filter((p) => p.nationality === filters.nationality);
      }

      if (filters.hasPlayedMatch !== "") {
        const hasPlayed = filters.hasPlayedMatch === "true";
        filtered = filtered.filter(
          (p) => (p.hasPlayedAtLeastOneMatch || false) === hasPlayed
        );
      }

      if (filters.inChampionship !== "") {
        const inChampionship = filters.inChampionship === "true";
        filtered = filtered.filter(
          (p) => (p.participation?.championnat || false) === inChampionship
        );
      }

      setFilteredPlayers(filtered);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la participation:",
        error
      );
    }
  };

  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
      redirectWhenUnauthorized="/joueur"
    >
      <Box sx={{ p: 5 }}>
          <Typography variant="h4" gutterBottom>
            Gestion des Joueurs
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Gérez les joueurs du club, leurs participations aux championnats et
            leurs équipes préférées.
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 2,
                  alignItems: { xs: "stretch", md: "center" },
                }}
              >
                <Box sx={{ flex: { xs: "1 1 auto", md: "0 0 300px" } }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rechercher un joueur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: searching ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : (
                        <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                      ),
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    flex: "1 1 auto",
                    flexWrap: "wrap",
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "140px" } }}>
                    <InputLabel>Genre</InputLabel>
                    <Select
                      value={filters.gender}
                      label="Genre"
                      onChange={(e) =>
                        setFilters({ ...filters, gender: e.target.value })
                      }
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="M">Masculin</MenuItem>
                      <MenuItem value="F">Féminin</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "160px" } }}>
                    <InputLabel>Nationalité</InputLabel>
                    <Select
                      value={filters.nationality}
                      label="Nationalité"
                      onChange={(e) =>
                        setFilters({ ...filters, nationality: e.target.value })
                      }
                    >
                      <MenuItem value="">Toutes</MenuItem>
                      <MenuItem value="FR">Française</MenuItem>
                      <MenuItem value="C">Européenne</MenuItem>
                      <MenuItem value="ETR">Étrangère</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
                    <InputLabel>A joué un match</InputLabel>
                    <Select
                      value={filters.hasPlayedMatch}
                      label="A joué un match"
                      onChange={(e) =>
                        setFilters({ ...filters, hasPlayedMatch: e.target.value })
                      }
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="true">A joué</MenuItem>
                      <MenuItem value="false">N&apos;a pas joué</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "200px" } }}>
                    <InputLabel>Inscrit en championnat</InputLabel>
                    <Select
                      value={filters.inChampionship}
                      label="Inscrit en championnat"
                      onChange={(e) =>
                        setFilters({ ...filters, inChampionship: e.target.value })
                      }
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="true">Inscrit</MenuItem>
                      <MenuItem value="false">Non inscrit</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={selectedTab}
              onChange={(_e, newValue) => setSelectedTab(newValue)}
            >
              <Tab label={`Joueurs actifs (${getFilteredCountForTab(0)})`} />
              <Tab label={`Sans licence (${getFilteredCountForTab(1)})`} />
              <Tab label={`Temporaires (${getFilteredCountForTab(2)})`} />
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            {loadingPlayers || searching ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : filteredPlayers.length === 0 ? (
              <Box display="flex" justifyContent="center" p={3}>
                <Typography variant="body1" color="text.secondary">
                  Aucun joueur trouvé
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Licence</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Points</TableCell>
                      <TableCell>Numéroté</TableCell>
                      <TableCell>Genre</TableCell>
                      <TableCell>Nationalité</TableCell>
                      <TableCell>Participation</TableCell>
                      <TableCell>Brûlage Masculin</TableCell>
                      <TableCell>Brûlage Féminin</TableCell>
                      <TableCell>Discord</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                              {player.firstName} {player.name}
                            </Typography>
                            {player.hasPlayedAtLeastOneMatch && (
                              <Chip
                                icon={<SportsTennisIcon />}
                                label="A joué"
                                size="small"
                                color="success"
                                variant="outlined"
                                title="Ce joueur a participé à au moins un match"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{player.license}</TableCell>
                        <TableCell>
                          <Chip
                            label={player.typeLicence || "N/A"}
                            color={
                              player.typeLicence === "T"
                                ? "success"
                                : player.typeLicence === "P"
                                ? "info"
                                : player.typeLicence === "A"
                                ? "warning"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {player.points || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {player.place ? (
                            <Chip
                              label={`N°${player.place}`}
                              color="primary"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.gender === "M" ? "Masculin" : "Féminin"}
                            color={
                              player.gender === "M" ? "primary" : "secondary"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              player.nationality === "FR"
                                ? "Française"
                                : player.nationality === "C"
                                ? "Européenne"
                                : "Étrangère"
                            }
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Switch
                              size="small"
                              checked={player.participation?.championnat || false}
                              onChange={(e) =>
                                handleToggleParticipation(
                                  player,
                                  e.target.checked
                                )
                              }
                              title={
                                player.participation?.championnat
                                  ? "Participe au championnat"
                                  : "Ne participe pas au championnat"
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {player.participation?.championnat ? "Oui" : "Non"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const burnedTeam = player.highestMasculineTeamNumberByPhase?.[currentPhase];
                            const matchesByTeam = player.masculineMatchesByTeamByPhase?.[currentPhase];
                            const hasData =
                              burnedTeam !== undefined ||
                              (matchesByTeam &&
                                Object.keys(matchesByTeam).length > 0);

                            return hasData ? (
                              <Tooltip
                                title={
                                  <Box>
                                    {burnedTeam ? (
                                      <>
                                        <Typography
                                          variant="body2"
                                          sx={{ mb: 1, fontWeight: "bold" }}
                                        >
                                          Brûlé dans l&apos;équipe {burnedTeam} (Masculin - Phase {currentPhase})
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block", mb: 1 }}
                                        >
                                          Ne peut pas jouer dans les équipes inférieures
                                        </Typography>
                                      </>
                                    ) : null}
                                    {matchesByTeam &&
                                    Object.keys(matchesByTeam).length > 0 ? (
                                      <>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            display: "block",
                                            mb: 0.5,
                                            fontWeight: "bold",
                                          }}
                                        >
                                          Matchs joués par équipe (Masculin - Phase {currentPhase}):
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                          {Object.entries(matchesByTeam)
                                            .sort(([a], [b]) => Number(a) - Number(b))
                                            .map(([team, count]) => (
                                              <Typography
                                                key={team}
                                                component="li"
                                                variant="caption"
                                                sx={{ display: "list-item" }}
                                              >
                                                Équipe {team}: {count} match
                                                {count > 1 ? "s" : ""}
                                              </Typography>
                                            ))}
                                        </Box>
                                      </>
                                    ) : null}
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Chip
                                  label={
                                    burnedTeam
                                      ? `Équipe ${burnedTeam}`
                                      : "Voir stats"
                                  }
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const burnedTeam = player.highestFeminineTeamNumberByPhase?.[currentPhase];
                            const matchesByTeam = player.feminineMatchesByTeamByPhase?.[currentPhase];
                            const hasData =
                              burnedTeam !== undefined ||
                              (matchesByTeam &&
                                Object.keys(matchesByTeam).length > 0);

                            return hasData ? (
                              <Tooltip
                                title={
                                  <Box>
                                    {burnedTeam ? (
                                      <>
                                        <Typography
                                          variant="body2"
                                          sx={{ mb: 1, fontWeight: "bold" }}
                                        >
                                          Brûlé dans l&apos;équipe {burnedTeam} (Féminin - Phase {currentPhase})
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block", mb: 1 }}
                                        >
                                          Ne peut pas jouer dans les équipes inférieures
                                        </Typography>
                                      </>
                                    ) : null}
                                    {matchesByTeam &&
                                    Object.keys(matchesByTeam).length > 0 ? (
                                      <>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            display: "block",
                                            mb: 0.5,
                                            fontWeight: "bold",
                                          }}
                                        >
                                          Matchs joués par équipe (Féminin - Phase {currentPhase}):
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                          {Object.entries(matchesByTeam)
                                            .sort(([a], [b]) => Number(a) - Number(b))
                                            .map(([team, count]) => (
                                              <Typography
                                                key={team}
                                                component="li"
                                                variant="caption"
                                                sx={{ display: "list-item" }}
                                              >
                                                Équipe {team}: {count} match
                                                {count > 1 ? "s" : ""}
                                              </Typography>
                                            ))}
                                        </Box>
                                      </>
                                    ) : null}
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Chip
                                  label={
                                    burnedTeam
                                      ? `Équipe ${burnedTeam}`
                                      : "Voir stats"
                                  }
                                  color="secondary"
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            badgeContent={player.discordMentions?.length || 0}
                            color="primary"
                            overlap="rectangular"
                            anchorOrigin={{
                              vertical: "top",
                              horizontal: "right",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AlternateEmailIcon />}
                              onClick={() => handleEditPlayer(player)}
                            >
                              Discord
                            </Button>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Joueurs sans licence
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Ces joueurs n&apos;ont pas encore de licence FFTT. Vous pouvez les
              rechercher pour les ajouter à une équipe temporairement.
            </Alert>
            {loadingPlayers || searching ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : filteredPlayers.length === 0 ? (
              <Box display="flex" justifyContent="center" p={3}>
                <Typography variant="body1" color="text.secondary">
                  Aucun joueur sans licence trouvé
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Licence</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Points</TableCell>
                      <TableCell>Numéroté</TableCell>
                      <TableCell>Genre</TableCell>
                      <TableCell>Nationalité</TableCell>
                      <TableCell>Participation</TableCell>
                      <TableCell>Discord</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                              {player.firstName} {player.name}
                            </Typography>
                            {player.hasPlayedAtLeastOneMatch && (
                              <Chip
                                icon={<SportsTennisIcon />}
                                label="A joué"
                                size="small"
                                color="success"
                                variant="outlined"
                                title="Ce joueur a participé à au moins un match"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Sans licence"
                            color="warning"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.typeLicence || "N/A"}
                            color={
                              player.typeLicence === "T"
                                ? "success"
                                : player.typeLicence === "P"
                                ? "info"
                                : player.typeLicence === "A"
                                ? "warning"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {player.points || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {player.place ? (
                            <Chip
                              label={`N°${player.place}`}
                              color="primary"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.gender === "M" ? "Masculin" : "Féminin"}
                            color={
                              player.gender === "M" ? "primary" : "secondary"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              player.nationality === "FR"
                                ? "Française"
                                : player.nationality === "C"
                                ? "Européenne"
                                : "Étrangère"
                            }
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Switch
                              size="small"
                              checked={player.participation?.championnat || false}
                              onChange={(e) =>
                                handleToggleParticipation(
                                  player,
                                  e.target.checked
                                )
                              }
                              title={
                                player.participation?.championnat
                                  ? "Participe au championnat"
                                  : "Ne participe pas au championnat"
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {player.participation?.championnat ? "Oui" : "Non"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Badge
                            badgeContent={player.discordMentions?.length || 0}
                            color="primary"
                            overlap="rectangular"
                            anchorOrigin={{
                              vertical: "top",
                              horizontal: "right",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AlternateEmailIcon />}
                              onClick={() => handleEditPlayer(player)}
                            >
                              Discord
                            </Button>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                Joueurs temporaires
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  // Réinitialiser le formulaire avant d'ouvrir le dialog
                  setNewPlayer({
                    firstName: "",
                    name: "",
                    license: "",
                    gender: "M",
                    nationality: "FR",
                    points: 500,
                    inChampionship: true,
                  });
                  setLicenseExists(false);
                  setCreateDialogOpen(true);
                }}
              >
                Créer un joueur temporaire
              </Button>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Ces joueurs ont été créés temporairement en attendant leur licence
              FFTT. Ils apparaissent clairement comme temporaires.
            </Alert>
            {loadingPlayers || searching ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : filteredPlayers.length === 0 ? (
              <Box display="flex" justifyContent="center" p={3}>
                <Typography variant="body1" color="text.secondary">
                  Aucun joueur temporaire trouvé
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Licence</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Points</TableCell>
                      <TableCell>Numéroté</TableCell>
                      <TableCell>Genre</TableCell>
                      <TableCell>Nationalité</TableCell>
                      <TableCell>Participation</TableCell>
                      <TableCell>Discord</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                              {player.firstName} {player.name}
                            </Typography>
                            {player.hasPlayedAtLeastOneMatch && (
                              <Chip
                                icon={<SportsTennisIcon />}
                                label="A joué"
                                size="small"
                                color="success"
                                variant="outlined"
                                title="Ce joueur a participé à au moins un match"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label="Temporaire" color="error" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.typeLicence || "N/A"}
                            color={
                              player.typeLicence === "T"
                                ? "success"
                                : player.typeLicence === "P"
                                ? "info"
                                : player.typeLicence === "A"
                                ? "warning"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {player.points || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {player.place ? (
                            <Chip
                              label={`N°${player.place}`}
                              color="primary"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.gender === "M" ? "Masculin" : "Féminin"}
                            color={
                              player.gender === "M" ? "primary" : "secondary"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              player.nationality === "FR"
                                ? "Française"
                                : player.nationality === "C"
                                ? "Européenne"
                                : "Étrangère"
                            }
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Switch
                              size="small"
                              checked={player.participation?.championnat || false}
                              onChange={(e) =>
                                handleToggleParticipation(
                                  player,
                                  e.target.checked
                                )
                              }
                              title={
                                player.participation?.championnat
                                  ? "Participe au championnat"
                                  : "Ne participe pas au championnat"
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {player.participation?.championnat ? "Oui" : "Non"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Badge
                            badgeContent={player.discordMentions?.length || 0}
                            color="primary"
                            overlap="rectangular"
                            anchorOrigin={{
                              vertical: "top",
                              horizontal: "right",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AlternateEmailIcon />}
                              onClick={() => handleEditPlayer(player)}
                            >
                              Discord
                            </Button>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditPlayer(player)}
                            >
                              Modifier
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeletePlayer(player)}
                              disabled={deleting === player.id}
                            >
                              {deleting === player.id ? "Suppression..." : "Supprimer"}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Dialog de création de joueur temporaire */}
          <Dialog
            open={createDialogOpen}
            onClose={() => {
              if (!creating) {
                setCreateDialogOpen(false);
                // Réinitialiser le formulaire à la fermeture
                setNewPlayer({
                  firstName: "",
                  name: "",
                  license: "",
                  gender: "M",
                  nationality: "FR",
                  points: 500,
                  inChampionship: true,
                });
                setLicenseExists(false);
              }
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Créer un joueur temporaire</DialogTitle>
            <DialogContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                <TextField
                  label="Prénom"
                  value={newPlayer.firstName}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Première lettre en majuscule, reste en minuscules
                    const normalized = value.length > 0 
                      ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                      : value;
                    setNewPlayer({ ...newPlayer, firstName: normalized });
                  }}
                  required
                  fullWidth
                />
                <TextField
                  label="Nom"
                  value={newPlayer.name}
                  onChange={(e) => {
                    // Tout en majuscules
                    setNewPlayer({ ...newPlayer, name: e.target.value.toUpperCase() });
                  }}
                  required
                  fullWidth
                />
                <TextField
                  label="Licence (optionnel)"
                  value={newPlayer.license}
                  onChange={async (e) => {
                    const license = e.target.value.trim();
                    setNewPlayer({ ...newPlayer, license: e.target.value });
                    if (license) {
                      await checkLicenseExists(license, editingPlayer?.id);
                    } else {
                      setLicenseExists(false);
                      setLicenseExistsForOther(false);
                    }
                  }}
                  fullWidth
                  error={licenseExists || licenseExistsForOther}
                  helperText={
                    licenseExistsForOther
                      ? "Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant."
                      : licenseExists
                      ? "Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant."
                      : "Laisser vide si pas encore de licence FFTT"
                  }
                />
                <FormControl fullWidth>
                  <InputLabel>Genre</InputLabel>
                  <Select
                    value={newPlayer.gender}
                    label="Genre"
                    onChange={(e) =>
                      setNewPlayer({
                        ...newPlayer,
                        gender: e.target.value as "M" | "F",
                      })
                    }
                  >
                    <MenuItem value="M">Masculin</MenuItem>
                    <MenuItem value="F">Féminin</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Nationalité</InputLabel>
                  <Select
                    value={newPlayer.nationality}
                    label="Nationalité"
                    onChange={(e) =>
                      setNewPlayer({
                        ...newPlayer,
                        nationality: e.target.value as "FR" | "C" | "ETR",
                      })
                    }
                  >
                    <MenuItem value="FR">Française</MenuItem>
                    <MenuItem value="C">Européenne</MenuItem>
                    <MenuItem value="ETR">Étrangère</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Points"
                  type="number"
                  value={newPlayer.points}
                  onChange={(e) =>
                    setNewPlayer({
                      ...newPlayer,
                      points: parseInt(e.target.value) || 500,
                    })
                  }
                  fullWidth
                  inputProps={{ min: 0 }}
                />
                <FormControl fullWidth>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Switch
                      checked={newPlayer.inChampionship}
                      onChange={(e) =>
                        setNewPlayer({
                          ...newPlayer,
                          inChampionship: e.target.checked,
                        })
                      }
                    />
                    <FormLabel>Participation au championnat</FormLabel>
                  </Box>
                </FormControl>
                <Box sx={{ position: "relative" }}>
                  <TextField
                    label="Discord (optionnel)"
                    fullWidth
                    value={discordMentions.map(id => {
                      const member = discordMembers.find(m => m.id === id);
                      return member ? `<@${member.id}>` : `<@${id}>`;
                    }).join(" ")}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      
                      // Détecter si on tape "@" ou si on est en train de taper après "@"
                      const textBeforeCursor = value.substring(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
                      
                      if (lastAtIndex !== -1) {
                        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
                          const query = textAfterAt.toLowerCase();
                          setMentionQuery(query);
                          setMentionAnchor({
                            anchorEl: e.target,
                            startPos: lastAtIndex,
                          });
                        } else {
                          setMentionAnchor(null);
                        }
                      } else {
                        setMentionAnchor(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (mentionAnchor) {
                        const filteredMembers = discordMembers.filter((member) => {
                          const query = mentionQuery.toLowerCase();
                          return (
                            member.displayName.toLowerCase().includes(query) ||
                            member.username.toLowerCase().includes(query)
                          );
                        });
                        
                        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
                          e.preventDefault();
                          if (e.key === "Escape") {
                            setMentionAnchor(null);
                          } else if (e.key === "Enter" && filteredMembers.length > 0) {
                            const selectedMember = filteredMembers[0];
                            if (!discordMentions.includes(selectedMember.id)) {
                              setDiscordMentions([...discordMentions, selectedMember.id]);
                            }
                            setMentionAnchor(null);
                          }
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as HTMLElement | null;
                      if (relatedTarget && relatedTarget.closest('[role="listbox"]')) {
                        return;
                      }
                      setTimeout(() => {
                        setMentionAnchor(null);
                      }, 200);
                    }}
                    placeholder="Tapez @ pour mentionner un membre Discord..."
                    helperText="Tapez @ suivi du nom d'un membre pour l'ajouter. Vous pouvez ajouter plusieurs mentions."
                  />
                  {mentionAnchor && (
                    <MentionSuggestions
                      members={discordMembers}
                      query={mentionQuery}
                      anchorEl={mentionAnchor.anchorEl}
                      onSelect={(member) => {
                        if (!discordMentions.includes(member.id)) {
                          setDiscordMentions([...discordMentions, member.id]);
                        }
                        setMentionAnchor(null);
                      }}
                    />
                  )}
                  {discordMentions.length > 0 && (
                    <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {discordMentions.map((id) => {
                        const member = discordMembers.find(m => m.id === id);
                        return (
                          <Chip
                            key={id}
                            label={member ? member.displayName : id}
                            onDelete={() => {
                              setDiscordMentions((prev) => prev.filter(mid => mid !== id));
                            }}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateTemporaryPlayer}
                variant="contained"
                disabled={creating || !newPlayer.firstName.trim() || !newPlayer.name.trim() || licenseExists}
              >
                {creating ? "Création..." : "Créer"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog d'édition de joueur temporaire */}
          <Dialog
            open={editDialogOpen}
            onClose={() => !updating && setEditDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>{editingPlayer?.isTemporary ? "Modifier un joueur temporaire" : "Gérer Discord"}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                {editingPlayer?.isTemporary ? (
                  <>
                    <TextField
                      label="Prénom"
                      value={newPlayer.firstName}
                      onChange={(e) => {
                        const value = e.target.value;
                        const normalized = value.length > 0 
                          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                          : value;
                        setNewPlayer({ ...newPlayer, firstName: normalized });
                      }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Nom"
                      value={newPlayer.name}
                      onChange={(e) => {
                        setNewPlayer({ ...newPlayer, name: e.target.value.toUpperCase() });
                      }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Licence (optionnel)"
                      value={newPlayer.license}
                      onChange={async (e) => {
                        const license = e.target.value.trim();
                        setNewPlayer({ ...newPlayer, license: e.target.value });
                        if (license) {
                          await checkLicenseExists(license, editingPlayer?.id);
                        } else {
                          setLicenseExists(false);
                          setLicenseExistsForOther(false);
                        }
                      }}
                      fullWidth
                      error={licenseExists || licenseExistsForOther}
                      helperText={
                        licenseExistsForOther
                          ? "Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant."
                          : licenseExists
                          ? "Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant."
                          : "Laisser vide si pas encore de licence FFTT"
                      }
                    />
                    <FormControl fullWidth>
                      <InputLabel>Genre</InputLabel>
                      <Select
                        value={newPlayer.gender}
                        label="Genre"
                        onChange={(e) =>
                          setNewPlayer({
                            ...newPlayer,
                            gender: e.target.value as "M" | "F",
                          })
                        }
                      >
                        <MenuItem value="M">Masculin</MenuItem>
                        <MenuItem value="F">Féminin</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Nationalité</InputLabel>
                      <Select
                        value={newPlayer.nationality}
                        label="Nationalité"
                        onChange={(e) =>
                          setNewPlayer({
                            ...newPlayer,
                            nationality: e.target.value as "FR" | "C" | "ETR",
                          })
                        }
                      >
                        <MenuItem value="FR">Française</MenuItem>
                        <MenuItem value="C">Européenne</MenuItem>
                        <MenuItem value="ETR">Étrangère</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Points"
                      type="number"
                      value={newPlayer.points}
                      onChange={(e) =>
                        setNewPlayer({
                          ...newPlayer,
                          points: parseInt(e.target.value) || 500,
                        })
                      }
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                    <FormControl fullWidth>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Switch
                          checked={newPlayer.inChampionship}
                          onChange={(e) =>
                            setNewPlayer({
                              ...newPlayer,
                              inChampionship: e.target.checked,
                            })
                          }
                        />
                        <FormLabel>Participation au championnat</FormLabel>
                      </Box>
                    </FormControl>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {editingPlayer?.firstName} {editingPlayer?.name} ({editingPlayer?.license})
                  </Typography>
                )}
                <Box sx={{ position: "relative" }}>
                  <TextField
                    label="Discord (optionnel)"
                    fullWidth
                    value={discordMentions.map(id => {
                      const member = discordMembers.find(m => m.id === id);
                      return member ? `<@${member.id}>` : `<@${id}>`;
                    }).join(" ")}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      
                      // Détecter si on tape "@" ou si on est en train de taper après "@"
                      const textBeforeCursor = value.substring(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
                      
                      if (lastAtIndex !== -1) {
                        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
                          const query = textAfterAt.toLowerCase();
                          setMentionQuery(query);
                          setMentionAnchor({
                            anchorEl: e.target,
                            startPos: lastAtIndex,
                          });
                        } else {
                          setMentionAnchor(null);
                        }
                      } else {
                        setMentionAnchor(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (mentionAnchor) {
                        const filteredMembers = discordMembers.filter((member) => {
                          const query = mentionQuery.toLowerCase();
                          return (
                            member.displayName.toLowerCase().includes(query) ||
                            member.username.toLowerCase().includes(query)
                          );
                        });
                        
                        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
                          e.preventDefault();
                          if (e.key === "Escape") {
                            setMentionAnchor(null);
                          } else if (e.key === "Enter" && filteredMembers.length > 0) {
                            const selectedMember = filteredMembers[0];
                            if (!discordMentions.includes(selectedMember.id)) {
                              setDiscordMentions([...discordMentions, selectedMember.id]);
                            }
                            setMentionAnchor(null);
                          }
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as HTMLElement | null;
                      if (relatedTarget && relatedTarget.closest('[role="listbox"]')) {
                        return;
                      }
                      setTimeout(() => {
                        setMentionAnchor(null);
                      }, 200);
                    }}
                    placeholder="Tapez @ pour mentionner un membre Discord..."
                    helperText="Tapez @ suivi du nom d'un membre pour l'ajouter. Vous pouvez ajouter plusieurs mentions."
                  />
                  {mentionAnchor && (
                    <MentionSuggestions
                      members={discordMembers}
                      query={mentionQuery}
                      anchorEl={mentionAnchor.anchorEl}
                      onSelect={(member) => {
                        if (!discordMentions.includes(member.id)) {
                          setDiscordMentions([...discordMentions, member.id]);
                        }
                        setMentionAnchor(null);
                      }}
                    />
                  )}
                  {discordMentions.length > 0 && (
                    <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {discordMentions.map((id) => {
                        const member = discordMembers.find(m => m.id === id);
                        return (
                          <Chip
                            key={id}
                            label={member ? member.displayName : id}
                            onDelete={() => {
                              setDiscordMentions((prev) => prev.filter(mid => mid !== id));
                            }}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingPlayer(null);
                  setDiscordMentions([]);
                  setLicenseExists(false);
                  setLicenseExistsForOther(false);
                }}
                disabled={updating || false}
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdatePlayer}
                variant="contained"
                disabled={!!(updating || (editingPlayer?.isTemporary && (!newPlayer.firstName.trim() || !newPlayer.name.trim() || licenseExists)))}
              >
                {updating ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
    </AuthGuard>
  );
}
