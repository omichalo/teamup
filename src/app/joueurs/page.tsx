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
} from "@mui/material";
import {
  Search as SearchIcon,
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import { USER_ROLES } from "@/lib/auth/roles";

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
      const updatedPlayers = players.map((p) =>
        p.id === player.id
          ? {
              ...p,
              participation: {
                ...p.participation,
                championnat: isParticipating,
              },
            }
          : p
      );
      setPlayers(updatedPlayers);
      setFilteredPlayers(
        updatedPlayers.filter((p) =>
          selectedTab === 0
            ? p.isActive
            : selectedTab === 1
            ? !p.isActive && !p.isTemporary
            : p.isTemporary
        )
      );
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
      <Layout>
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
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr",
                  },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Box>
                  <TextField
                    fullWidth
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
                  display="flex"
                  gap={2}
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <FormControl size="small">
                    <FormLabel>Genre</FormLabel>
                    <select
                      value={filters.gender}
                      onChange={(e) =>
                        setFilters({ ...filters, gender: e.target.value })
                      }
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        minWidth: "120px",
                      }}
                    >
                      <option value="">Tous</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </FormControl>
                  <FormControl size="small">
                    <FormLabel>Nationalité</FormLabel>
                    <select
                      value={filters.nationality}
                      onChange={(e) =>
                        setFilters({ ...filters, nationality: e.target.value })
                      }
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        minWidth: "120px",
                      }}
                    >
                      <option value="">Toutes</option>
                      <option value="FR">Française</option>
                      <option value="C">Européenne</option>
                      <option value="ETR">Étrangère</option>
                    </select>
                  </FormControl>
                  <FormControl size="small">
                    <FormLabel>A joué un match</FormLabel>
                    <select
                      value={filters.hasPlayedMatch}
                      onChange={(e) =>
                        setFilters({ ...filters, hasPlayedMatch: e.target.value })
                      }
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        minWidth: "140px",
                      }}
                    >
                      <option value="">Tous</option>
                      <option value="true">A joué</option>
                      <option value="false">N&apos;a pas joué</option>
                    </select>
                  </FormControl>
                  <FormControl size="small">
                    <FormLabel>Inscrit en championnat</FormLabel>
                    <select
                      value={filters.inChampionship}
                      onChange={(e) =>
                        setFilters({ ...filters, inChampionship: e.target.value })
                      }
                      style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        minWidth: "160px",
                      }}
                    >
                      <option value="">Tous</option>
                      <option value="true">Inscrit</option>
                      <option value="false">Non inscrit</option>
                    </select>
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
              <Tab label={`Joueurs actifs (${filteredPlayers.length})`} />
              <Tab label="Sans licence" />
              <Tab label="Temporaires" />
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Joueurs temporaires
            </Typography>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Layout>
    </AuthGuard>
  );
}
