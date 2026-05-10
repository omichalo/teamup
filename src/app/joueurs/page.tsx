"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  Switch,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { AuthGuard } from "@/components/AuthGuard";
import { useTeamData } from "@/hooks/useTeamData";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import { USER_ROLES } from "@/lib/auth/roles";
import { useTeamManagementStore } from "@/stores/teamManagementStore";
import { getPhaseOfNextChampionnatEquipesMatch } from "@/lib/shared/phase-utils";
import {
  applyJoueursFilters,
  getPlayersForTab,
  type JoueursFilters,
} from "@/lib/players/player-filters";
import { useJoueursCrud } from "@/hooks/useJoueursCrud";
import { PlayersBasicTable } from "@/components/players/PlayersBasicTable";
import { PlayersActiveTable } from "@/components/players/PlayersActiveTable";
import { DiscordMentionsAutocomplete } from "@/components/players/DiscordMentionsAutocomplete";

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

export default function JoueursPage() {
  const { equipes, currentPhase } = useTeamData();
  const updatePlayerInStore = useTeamManagementStore(
    (state) => state.updatePlayer
  );
  const removePlayerFromStore = useTeamManagementStore(
    (state) => state.removePlayer
  );
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
  const [filters, setFilters] = useState<JoueursFilters>({
    gender: "",
    nationality: "",
    isActive: true,
    hasPlayedMatch: "", // "" = tous, "true" = a joué, "false" = n'a pas joué
    inChampionship: "", // "" = tous, "true" = inscrit, "false" = pas inscrit
    inChampionshipParis: "", // "" = tous, "true" = inscrit, "false" = pas inscrit
    hasDiscord: "", // "" = tous, "true" = avec Discord valide, "false" = sans Discord
  });
  const { members: discordMembers } = useDiscordMembers();

  const playerService = useMemo(() => new FirestorePlayerService(), []);

  const burnoutPhase = useMemo<"aller" | "retour">(() => {
    const phaseOfNextMatch = getPhaseOfNextChampionnatEquipesMatch(equipes);
    return phaseOfNextMatch ?? currentPhase ?? "aller";
  }, [currentPhase, equipes]);

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

  // Fonction helper pour vérifier si un joueur a des IDs Discord invalides
  const hasInvalidDiscordMentions = useCallback(
    (player: Player): boolean => {
      if (!player.discordMentions || player.discordMentions.length === 0) {
        return false;
      }
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      return player.discordMentions.some(
        (mentionId) => !validMemberIds.has(mentionId)
      );
    },
    [discordMembers]
  );

  // Fonction helper pour vérifier si un joueur a au moins un Discord valide
  const hasValidDiscord = useCallback(
    (player: Player): boolean => {
      if (!player.discordMentions || player.discordMentions.length === 0) {
        return false;
      }
      const validMemberIds = new Set(discordMembers.map((m) => m.id));
      // Un joueur a Discord si au moins un de ses discordMentions est valide
      return player.discordMentions.some((mentionId) =>
        validMemberIds.has(mentionId)
      );
    },
    [discordMembers]
  );

  // Fonction pour vérifier si un Discord ID est déjà utilisé par un autre joueur
  const isDiscordIdUsedByOtherPlayer = useCallback(
    (
      discordId: string,
      excludePlayerId?: string
    ): { used: boolean; playerName?: string } => {
      const allPlayers = [
        ...players,
        ...playersWithoutLicense,
        ...temporaryPlayers,
      ];
      for (const player of allPlayers) {
        // Ignorer le joueur en cours d'édition
        if (excludePlayerId && player.id === excludePlayerId) {
          continue;
        }
        if (
          player.discordMentions &&
          player.discordMentions.includes(discordId)
        ) {
          return {
            used: true,
            playerName:
              `${player.firstName} ${player.name}`.trim() || player.license,
          };
        }
      }
      return { used: false };
    },
    [players, playersWithoutLicense, temporaryPlayers]
  );

  // Calculer les joueurs filtrés pour chaque onglet (pour afficher les compteurs)
  const getFilteredCountForTab = useCallback(
    (tabIndex: number) => {
      const sourcePlayers = getPlayersForTab(
        tabIndex,
        players,
        playersWithoutLicense,
        temporaryPlayers
      );
      return applyJoueursFilters({
        sourcePlayers,
        searchQuery,
        filters,
        hasValidDiscord,
      }).length;
    },
    [
      players,
      playersWithoutLicense,
      temporaryPlayers,
      searchQuery,
      filters,
      hasValidDiscord,
    ]
  );

  const filterPlayers = useCallback(async () => {
    try {
      setSearching(true);
      const sourcePlayers = getPlayersForTab(
        selectedTab,
        players,
        playersWithoutLicense,
        temporaryPlayers
      );
      const filtered = applyJoueursFilters({
        sourcePlayers,
        searchQuery,
        filters,
        hasValidDiscord,
      });
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
    hasValidDiscord,
  ]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    filterPlayers();
  }, [filterPlayers]);

  const recomputeFilteredPlayersFromLists = useCallback(
    (
      nextPlayers: Player[],
      nextPlayersWithoutLicense: Player[],
      nextTemporaryPlayers: Player[]
    ) => {
      const sourcePlayers = getPlayersForTab(
        selectedTab,
        nextPlayers,
        nextPlayersWithoutLicense,
        nextTemporaryPlayers
      );
      const filtered = applyJoueursFilters({
        sourcePlayers,
        searchQuery,
        filters,
        hasValidDiscord,
      });
      setFilteredPlayers(filtered);
    },
    [selectedTab, searchQuery, filters, hasValidDiscord]
  );

  const {
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingPlayer,
    setEditingPlayer,
    creating,
    updating,
    deleting,
    newPlayer,
    setNewPlayer,
    licenseExists,
    setLicenseExists,
    licenseExistsForOther,
    setLicenseExistsForOther,
    discordMentions,
    setDiscordMentions,
    discordMentionError,
    setDiscordMentionError,
    checkLicenseExists,
    handleCreateTemporaryPlayer,
    handleEditPlayer,
    handleUpdatePlayer,
    handleDeletePlayer,
  } = useJoueursCrud({
    playerService,
    players,
    playersWithoutLicense,
    temporaryPlayers,
    setPlayers,
    setPlayersWithoutLicense,
    setTemporaryPlayers,
    updatePlayerInStore,
    removePlayerFromStore,
    loadPlayers,
    recomputeFilteredPlayersFromLists,
  });

  const handleToggleParticipationParis = async (
    player: Player,
    inChampionshipParis: boolean
  ) => {
    try {
      // Mettre à jour seulement la participation au championnat de Paris
      await playerService.updatePlayer(player.id, {
        participation: {
          ...player.participation,
          championnatParis: inChampionshipParis,
        },
      });

      // Mettre à jour l'état local
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.id === player.id
            ? {
                ...p,
                participation: {
                  ...p.participation,
                  championnatParis: inChampionshipParis,
                },
              }
            : p
        )
      );

      // Mettre à jour le store Zustand pour synchroniser avec les autres pages
      updatePlayerInStore(player.id, {
        participation: {
          ...player.participation,
          championnatParis: inChampionshipParis,
        },
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la participation au championnat de Paris:",
        error
      );
      alert("Erreur lors de la mise à jour de la participation");
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
      const updatedPlayersWithoutLicense =
        playersWithoutLicense.map(updatePlayerInList);

      setPlayers(updatedPlayers);
      setTemporaryPlayers(updatedTemporaryPlayers);
      setPlayersWithoutLicense(updatedPlayersWithoutLicense);

      // Mettre à jour le store Zustand pour synchroniser avec les autres pages
      updatePlayerInStore(player.id, {
        participation: {
          ...player.participation,
          championnat: isParticipating,
        },
      });

      recomputeFilteredPlayersFromLists(
        updatedPlayers,
        updatedPlayersWithoutLicense,
        updatedTemporaryPlayers
      );
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la participation:",
        error
      );
    }
  };

  const handleToggleWheelchair = useCallback(
    async (player: Player) => {
      const newValue = !player.isWheelchair;
      const oldValue = player.isWheelchair;

      const applyWheelchairState = (value: boolean) => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, isWheelchair: value } : p
          )
        );
        setPlayersWithoutLicense((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, isWheelchair: value } : p
          )
        );
        setTemporaryPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, isWheelchair: value } : p
          )
        );
        setFilteredPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, isWheelchair: value } : p
          )
        );
      };

      applyWheelchairState(newValue ?? false);
      try {
        await playerService.updatePlayer(player.id, { isWheelchair: newValue });
        updatePlayerInStore(player.id, { isWheelchair: newValue });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du flag fauteuil:", error);
        applyWheelchairState(oldValue ?? false);
      }
    },
    [playerService, updatePlayerInStore]
  );

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
              <Box sx={{ flex: { xs: "1 1 auto", md: "0 0 240px" } }}>
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
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "140px" } }}
                >
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
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "160px" } }}
                >
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
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "180px" } }}
                >
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
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "200px" } }}
                >
                  <InputLabel>Championnat</InputLabel>
                  <Select
                    value={filters.inChampionship}
                    label="Championnat"
                    onChange={(e) =>
                      setFilters({ ...filters, inChampionship: e.target.value })
                    }
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="true">Inscrit</MenuItem>
                    <MenuItem value="false">Non inscrit</MenuItem>
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "220px" } }}
                >
                  <InputLabel>Championnat de Paris</InputLabel>
                  <Select
                    value={filters.inChampionshipParis}
                    label="Championnat de Paris"
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        inChampionshipParis: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="true">Inscrit</MenuItem>
                    <MenuItem value="false">Non inscrit</MenuItem>
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: "100%", sm: "160px" } }}
                >
                  <InputLabel>Discord</InputLabel>
                  <Select
                    value={filters.hasDiscord}
                    label="Discord"
                    onChange={(e) =>
                      setFilters({ ...filters, hasDiscord: e.target.value })
                    }
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="true">Avec Discord</MenuItem>
                    <MenuItem value="false">Sans Discord</MenuItem>
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
            <PlayersActiveTable
              players={filteredPlayers}
              currentPhase={burnoutPhase}
              hasInvalidDiscordMentions={hasInvalidDiscordMentions}
              onEditPlayer={handleEditPlayer}
              onToggleParticipation={handleToggleParticipation}
              onToggleParticipationParis={handleToggleParticipationParis}
              onToggleWheelchair={handleToggleWheelchair}
            />
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
            <PlayersBasicTable
              players={filteredPlayers}
              licenseMode="withoutLicense"
              hasInvalidDiscordMentions={hasInvalidDiscordMentions}
              onEditPlayer={handleEditPlayer}
              onToggleParticipation={handleToggleParticipation}
              onToggleParticipationParis={handleToggleParticipationParis}
              onToggleWheelchair={handleToggleWheelchair}
            />
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
            <Typography variant="h6">Joueurs temporaires</Typography>
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
                  isWheelchair: false,
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
            <PlayersBasicTable
              players={filteredPlayers}
              licenseMode="temporary"
              showActions
              deletingPlayerId={deleting}
              hasInvalidDiscordMentions={hasInvalidDiscordMentions}
              onEditPlayer={handleEditPlayer}
              onDeletePlayer={handleDeletePlayer}
              onToggleParticipation={handleToggleParticipation}
              onToggleParticipationParis={handleToggleParticipationParis}
              onToggleWheelchair={handleToggleWheelchair}
            />
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
                isWheelchair: false,
              });
              setLicenseExists(false);
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Créer un joueur temporaire</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
            >
              <TextField
                label="Prénom"
                value={newPlayer.firstName}
                onChange={(e) => {
                  const value = e.target.value;
                  // Première lettre en majuscule, reste en minuscules
                  const normalized =
                    value.length > 0
                      ? value.charAt(0).toUpperCase() +
                        value.slice(1).toLowerCase()
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
                  setNewPlayer({
                    ...newPlayer,
                    name: e.target.value.toUpperCase(),
                  });
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
              <DiscordMentionsAutocomplete
                members={discordMembers}
                selectedIds={discordMentions}
                onSelectedIdsChange={setDiscordMentions}
                error={discordMentionError}
                onErrorChange={setDiscordMentionError}
                findUsage={isDiscordIdUsedByOtherPlayer}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setDiscordMentionError(null);
              }}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateTemporaryPlayer}
              variant="contained"
              disabled={
                creating ||
                !!discordMentionError ||
                !newPlayer.firstName.trim() ||
                !newPlayer.name.trim() ||
                licenseExists
              }
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
          <DialogTitle>
            {editingPlayer?.isTemporary
              ? "Modifier un joueur temporaire"
              : "Gérer Discord"}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
            >
              {editingPlayer?.isTemporary ? (
                <>
                  <TextField
                    label="Prénom"
                    value={newPlayer.firstName}
                    onChange={(e) => {
                      const value = e.target.value;
                      const normalized =
                        value.length > 0
                          ? value.charAt(0).toUpperCase() +
                            value.slice(1).toLowerCase()
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
                      setNewPlayer({
                        ...newPlayer,
                        name: e.target.value.toUpperCase(),
                      });
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {editingPlayer?.firstName} {editingPlayer?.name} (
                  {editingPlayer?.license})
                </Typography>
              )}
              <DiscordMentionsAutocomplete
                members={discordMembers}
                selectedIds={discordMentions}
                onSelectedIdsChange={setDiscordMentions}
                error={discordMentionError}
                onErrorChange={setDiscordMentionError}
                findUsage={isDiscordIdUsedByOtherPlayer}
                excludePlayerId={editingPlayer?.id}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditDialogOpen(false);
                setEditingPlayer(null);
                setDiscordMentions([]);
                setDiscordMentionError(null);
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
              disabled={
                !!(
                  updating ||
                  discordMentionError ||
                  (editingPlayer?.isTemporary &&
                    (!newPlayer.firstName.trim() ||
                      !newPlayer.name.trim() ||
                      licenseExists))
                )
              }
            >
              {updating ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AuthGuard>
  );
}
