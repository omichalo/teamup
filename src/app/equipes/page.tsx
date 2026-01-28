"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  // Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  // List,
  // ListItem,
  // ListItemText,
} from "@mui/material";
import {
  ExpandMore,
  SportsTennis,
  Home,
  FlightTakeoff,
  Close,
  Info,
  Message,
  LocationOn,
} from "@mui/icons-material";
import { useTeamData } from "@/hooks/useTeamData";
import { Match } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useAuth } from "@/hooks/useAuth";
import { useTeamManagementStore } from "@/stores/teamManagementStore";

export default function EquipesPage() {
  const { user } = useAuth();
  const { equipes: initialEquipes, loading, error } = useTeamData();
  const updateTeamInStore = useTeamManagementStore((state) => state.updateTeam);
  const [equipes, setEquipes] = React.useState(initialEquipes);
  const [tabValue, setTabValue] = React.useState(0);
  const [selectedMatch, setSelectedMatch] = React.useState<Match | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [locations, setLocations] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [editingTeamLocation, setEditingTeamLocation] = React.useState<
    string | null
  >(null);
  const [selectedLocationId, setSelectedLocationId] = React.useState<
    string | null
  >(null);
  const [updatingLocation, setUpdatingLocation] = React.useState<string | null>(
    null
  );
  const [filterLocationId, setFilterLocationId] = React.useState<string | null>(
    null
  );
  const [editingTeamDiscordChannel, setEditingTeamDiscordChannel] =
    React.useState<string | null>(null);
  const [selectedDiscordChannelId, setSelectedDiscordChannelId] =
    React.useState<string | null>(null);
  const [updatingDiscordChannel, setUpdatingDiscordChannel] = React.useState<
    string | null
  >(null);
  const [discordChannels, setDiscordChannels] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [discordChannelsHierarchy, setDiscordChannelsHierarchy] =
    React.useState<
      Array<{
        category: { id: string; name: string; position: number } | null;
        channels: Array<{ id: string; name: string; position: number }>;
      }>
    >([]);
  const [loadingDiscordChannels, setLoadingDiscordChannels] =
    React.useState(false);

  // Synchroniser l'état local avec les équipes initiales
  React.useEffect(() => {
    setEquipes(initialEquipes);
  }, [initialEquipes]);

  // Filtrer les équipes selon le lieu sélectionné
  const filteredEquipes = React.useMemo(() => {
    if (!filterLocationId) {
      return equipes;
    }
    return equipes.filter(
      (equipe) => equipe.team.location === filterLocationId
    );
  }, [equipes, filterLocationId]);

  // Grouper les équipes par épreuve en utilisant le vrai libellé de l&apos;API
  const equipesByEpreuve = filteredEquipes.reduce((acc, equipe) => {
    // Déterminer l'épreuve : d'abord depuis l'équipe elle-même, sinon depuis les matchs
    let epreuve: string | null = null;

    // Essayer d'abord depuis l'équipe (si l'info est disponible)
    if (equipe.team.epreuve) {
      epreuve = equipe.team.epreuve;
    } else if (equipe.matches.length > 0) {
      // Fallback : utiliser le libellé d&apos;épreuve depuis les matchs
      epreuve =
        equipe.matches[0].epreuve ||
        (equipe.matches[0].division?.includes("Féminin") ||
        equipe.matches[0].division?.includes("Dames")
          ? "Championnat de France par Équipes Féminin"
          : "Championnat de France par Équipes Masculin");
    } else {
      // Si pas de matchs et pas d'info d'épreuve, utiliser la division pour déterminer
      const division = equipe.team.division || "";
      if (division.includes("Féminin") || division.includes("Dames")) {
        epreuve = "Championnat de France par Équipes Féminin";
      } else if (
        division.toLowerCase().includes("excellence") ||
        division.toLowerCase().includes("paris idf")
      ) {
        epreuve = "L08_Championnat de Paris IDF";
      } else {
        epreuve = "Championnat de France par Équipes Masculin";
      }
    }

    if (epreuve) {
      if (!acc[epreuve]) {
        acc[epreuve] = [];
      }
      acc[epreuve].push(equipe);
    }
    return acc;
  }, {} as Record<string, typeof filteredEquipes>);

  const epreuves = React.useMemo(() => {
    return Object.keys(equipesByEpreuve).sort((a, b) => {
      // Priorité 1: Excellence en dernier
      const isExcellenceA =
        a.toLowerCase().includes("excellence") ||
        a.toLowerCase().includes("paris idf");
      const isExcellenceB =
        b.toLowerCase().includes("excellence") ||
        b.toLowerCase().includes("paris idf");

      if (isExcellenceA !== isExcellenceB) {
        return isExcellenceA ? 1 : -1; // Excellence en dernier
      }

      // Priorité 2: Masculin avant Féminin
      const femA =
        a.toLowerCase().includes("féminin") ||
        a.toLowerCase().includes("dames");
      const femB =
        b.toLowerCase().includes("féminin") ||
        b.toLowerCase().includes("dames");

      if (femA !== femB) {
        return femA ? 1 : -1; // Inversé : masculin en premier
      }

      return b.localeCompare(a); // Inversé : ordre alphabétique inversé
    });
  }, [equipesByEpreuve]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMatchClick = (match: Match) => {
    if (match.resultatsIndividuels) {
      setSelectedMatch(match);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMatch(null);
  };

  // Charger les lieux disponibles
  React.useEffect(() => {
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
            setLocations(result.locations || []);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
      }
    };
    void loadLocations();
  }, []);

  // Charger les canaux Discord disponibles
  React.useEffect(() => {
    const loadDiscordChannels = async () => {
      if (
        !user ||
        (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.COACH)
      ) {
        return;
      }
      try {
        setLoadingDiscordChannels(true);
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
            setDiscordChannelsHierarchy(result.hierarchy || []);
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
      } finally {
        setLoadingDiscordChannels(false);
      }
    };
    void loadDiscordChannels();
  }, [user]);

  const handleUpdateTeamLocation = React.useCallback(
    async (teamId: string, locationId: string | null) => {
      if (!user) return;

      setUpdatingLocation(teamId);
      try {
        const response = await fetch(`/api/teams/${teamId}/location`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ location: locationId }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(
            result.error || "Erreur lors de la mise à jour du lieu"
          );
        }

        // Mettre à jour l'état local des équipes sans recharger la page
        setEquipes((prevEquipes) =>
          prevEquipes.map((equipe) =>
            equipe.team.id === teamId
              ? {
                  ...equipe,
                  team: {
                    ...equipe.team,
                    location: locationId ?? undefined,
                  } as typeof equipe.team,
                }
              : equipe
          )
        );

        // Mettre à jour le store Zustand pour synchroniser avec les autres pages
        updateTeamInStore(teamId, {
          ...(locationId !== null && { location: locationId }),
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du lieu:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du lieu"
        );
      } finally {
        setUpdatingLocation(null);
        setEditingTeamLocation(null);
        setSelectedLocationId(null);
      }
    },
    [user, updateTeamInStore]
  );

  const handleOpenLocationDialog = React.useCallback(
    (teamId: string) => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      setSelectedLocationId(equipe?.team.location || null);
      setEditingTeamLocation(teamId);
    },
    [equipes]
  );

  const handleSaveLocation = React.useCallback(() => {
    if (editingTeamLocation) {
      void handleUpdateTeamLocation(editingTeamLocation, selectedLocationId);
    }
  }, [editingTeamLocation, selectedLocationId, handleUpdateTeamLocation]);

  const handleUpdateTeamDiscordChannel = React.useCallback(
    async (teamId: string, channelId: string | null) => {
      if (!user) return;

      setUpdatingDiscordChannel(teamId);
      try {
        const response = await fetch(`/api/teams/${teamId}/discord-channel`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ discordChannelId: channelId }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(
            result.error || "Erreur lors de la mise à jour du canal Discord"
          );
        }

        // Mettre à jour l'état local des équipes sans recharger la page
        setEquipes((prevEquipes) =>
          prevEquipes.map((equipe) =>
            equipe.team.id === teamId
              ? {
                  ...equipe,
                  team: {
                    ...equipe.team,
                    discordChannelId: channelId ?? undefined,
                  } as typeof equipe.team,
                }
              : equipe
          )
        );

        // Mettre à jour le store Zustand pour synchroniser avec les autres pages
        updateTeamInStore(teamId, {
          ...(channelId !== null && { discordChannelId: channelId }),
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du canal Discord:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du canal Discord"
        );
      } finally {
        setUpdatingDiscordChannel(null);
        setEditingTeamDiscordChannel(null);
        setSelectedDiscordChannelId(null);
      }
    },
    [user, updateTeamInStore]
  );

  const handleOpenDiscordChannelDialog = React.useCallback(
    (teamId: string) => {
      const equipe = equipes.find((e) => e.team.id === teamId);
      setSelectedDiscordChannelId(equipe?.team.discordChannelId || null);
      setEditingTeamDiscordChannel(teamId);
    },
    [equipes]
  );

  const handleSaveDiscordChannel = React.useCallback(() => {
    if (editingTeamDiscordChannel) {
      void handleUpdateTeamDiscordChannel(
        editingTeamDiscordChannel,
        selectedDiscordChannelId
      );
    }
  }, [
    editingTeamDiscordChannel,
    selectedDiscordChannelId,
    handleUpdateTeamDiscordChannel,
  ]);

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: string | Date) => {
    const dateObj = new Date(date);
    // Ne pas afficher l&apos;heure si elle est à minuit (pas d&apos;heure disponible)
    if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
      return "";
    }
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  const getMatchStatusChip = (match: Match) => {
    // Utiliser le résultat déterminé par l&apos;API plutôt que la date
    if (match.result === "EXEMPT") {
      return <Chip label="EXEMPT" color="info" size="small" />;
    }
    if (match.result === "W.O.") {
      return <Chip label="W.O." color="error" size="small" />;
    }
    if (match.result === "VICTOIRE") {
      return <Chip label="VICTOIRE" color="success" size="small" />;
    }
    // Gérer les deux formats : "DEFAITE" (nouveau) et "DÉFAITE" (ancien)
    if (match.result === "DEFAITE" || match.result === "DÉFAITE") {
      return <Chip label="DÉFAITE" color="error" size="small" />;
    }
    if (match.result === "NUL" || match.result === "ÉGALITÉ") {
      return <Chip label="NUL" color="warning" size="small" />;
    }
    if (match.result === "À VENIR") {
      return <Chip label="À VENIR" color="warning" size="small" />;
    }

    // Fallback sur l&apos;ancienne logique si pas de résultat
    return <Chip label="À VENIR" color="warning" size="small" />;
  };

  if (loading) {
    return (
      <AuthGuard
        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
        redirectWhenUnauthorized="/joueur"
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Chargement des équipes et matchs...
          </Typography>
        </Box>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard
        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
        redirectWhenUnauthorized="/joueur"
      >
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Erreur lors du chargement des données : {error}
          </Alert>
        </Box>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
      redirectWhenUnauthorized="/joueur"
    >
      <Box sx={{ p: 5 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Équipes SQY Ping
        </Typography>

        {equipes.length === 0 ? (
          <Alert severity="info">Aucune équipe trouvée.</Alert>
        ) : (
          <Box sx={{ mt: 3 }}>
            {/* Filtre par lieu */}
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filtrer par lieu</InputLabel>
                <Select
                  value={filterLocationId || ""}
                  label="Filtrer par lieu"
                  onChange={(e) => {
                    setFilterLocationId(
                      e.target.value === "" ? null : e.target.value
                    );
                    setTabValue(0); // Réinitialiser l'onglet lors du changement de filtre
                  }}
                >
                  <MenuItem value="">
                    <em>Tous les lieux</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {filterLocationId && (
                <Chip
                  label={`${filteredEquipes.length} équipe${
                    filteredEquipes.length > 1 ? "s" : ""
                  }`}
                  color="primary"
                  size="small"
                  onDelete={() => setFilterLocationId(null)}
                />
              )}
            </Box>

            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
              {epreuves.map((epreuve) => (
                <Tab
                  key={epreuve}
                  label={`${epreuve} (${equipesByEpreuve[epreuve].length})`}
                  icon={<SportsTennis />}
                  sx={{
                    color:
                      epreuve.toLowerCase().includes("excellence") ||
                      epreuve.toLowerCase().includes("paris idf")
                        ? "secondary.main"
                        : epreuve.includes("Féminin")
                        ? "secondary.main"
                        : "primary.main",
                    "&.Mui-selected": {
                      color:
                        epreuve.toLowerCase().includes("excellence") ||
                        epreuve.toLowerCase().includes("paris idf")
                          ? "secondary.main"
                          : epreuve.includes("Féminin")
                          ? "secondary.main"
                          : "primary.main",
                    },
                  }}
                />
              ))}
            </Tabs>

            {/* Contenu des onglets */}
            {epreuves.map(
              (epreuve, index) =>
                tabValue === index && (
                  <Box key={epreuve}>
                    {equipesByEpreuve[epreuve].length === 0 ? (
                      <Alert severity="info">
                        Aucune équipe trouvée pour cette épreuve.
                      </Alert>
                    ) : (
                      equipesByEpreuve[epreuve]
                        .sort((a, b) => {
                          // Supporte les formats : "SQY PING 3", "SQY PING (3)", "SQY PING (3) - Phase 1", etc.
                          const matchAWithParentheses = a.team.name.match(/SQY PING\s*\((\d+)\)/i);
                          const matchA = matchAWithParentheses || a.team.name.match(/SQY PING\s*(\d+)/i);
                          const numA = parseInt(matchA?.[1] || "0");
                          
                          const matchBWithParentheses = b.team.name.match(/SQY PING\s*\((\d+)\)/i);
                          const matchB = matchBWithParentheses || b.team.name.match(/SQY PING\s*(\d+)/i);
                          const numB = parseInt(matchB?.[1] || "0");
                          
                          return numA - numB;
                        })
                        .map((equipeWithMatches) => {
                          const name = equipeWithMatches.team.name;
                          const div = equipeWithMatches.team.division || "";
                          const isPhase2 =
                            /Phase 2/i.test(name) || /Phase 2/i.test(div);
                          const isPhase1 =
                            /Phase 1/i.test(name) || /Phase 1/i.test(div);
                          const displayMatches = isPhase2
                            ? equipeWithMatches.matches.filter(
                                (m) =>
                                  (m.phase || "").toLowerCase() === "retour"
                              )
                            : isPhase1
                              ? equipeWithMatches.matches.filter(
                                  (m) =>
                                    (m.phase || "").toLowerCase() === "aller"
                                )
                              : equipeWithMatches.matches;

                          return (
                          <Accordion
                            key={equipeWithMatches.team.id}
                            sx={{
                              mb: 2,
                              borderLeft: `4px solid ${
                                epreuve.toLowerCase().includes("excellence") ||
                                epreuve.toLowerCase().includes("paris idf")
                                  ? "#9c27b0" // Violet pour Excellence
                                  : epreuve.includes("Féminin")
                                  ? "#f57c00"
                                  : "#1976d2"
                              }`,
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  width: "100%",
                                }}
                              >
                                <SportsTennis
                                  sx={{
                                    mr: 2,
                                    color:
                                      epreuve
                                        .toLowerCase()
                                        .includes("excellence") ||
                                      epreuve
                                        .toLowerCase()
                                        .includes("paris idf")
                                        ? "secondary.main"
                                        : epreuve.includes("Féminin")
                                        ? "secondary.main"
                                        : "primary.main",
                                  }}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h6">
                                    {equipeWithMatches.team.name}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {equipeWithMatches.team.division}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mt: 0.5,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Lieu:{" "}
                                      {equipeWithMatches.team.location
                                        ? locations.find(
                                            (l) =>
                                              l.id ===
                                              equipeWithMatches.team.location
                                          )?.name ||
                                          equipeWithMatches.team.location
                                        : "Non défini"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Discord:{" "}
                                      {equipeWithMatches.team.discordChannelId
                                        ? discordChannels.find(
                                            (c) =>
                                              c.id ===
                                              equipeWithMatches.team
                                                .discordChannelId
                                          )?.name || "Canal configuré"
                                        : "Non configuré"}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  {user &&
                                    (user.role === USER_ROLES.ADMIN ||
                                      user.role === USER_ROLES.COACH) && (
                                      <>
                                        <Box
                                          component="div"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLocationDialog(
                                              equipeWithMatches.team.id
                                            );
                                          }}
                                          sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 32,
                                            height: 32,
                                            cursor: "pointer",
                                            borderRadius: "50%",
                                            "&:hover": {
                                              backgroundColor: "action.hover",
                                            },
                                          }}
                                          title="Modifier le lieu"
                                        >
                                          <LocationOn fontSize="small" />
                                        </Box>
                                        <Box
                                          component="div"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDiscordChannelDialog(
                                              equipeWithMatches.team.id
                                            );
                                          }}
                                          sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 32,
                                            height: 32,
                                            cursor: "pointer",
                                            borderRadius: "50%",
                                            "&:hover": {
                                              backgroundColor: "action.hover",
                                            },
                                          }}
                                          title="Modifier le canal Discord"
                                        >
                                          <Message fontSize="small" />
                                        </Box>
                                      </>
                                    )}
                                  <Chip
                                    label={`${displayMatches.length} matchs`}
                                    color={
                                      epreuve
                                        .toLowerCase()
                                        .includes("excellence") ||
                                      epreuve
                                        .toLowerCase()
                                        .includes("paris idf")
                                        ? "secondary"
                                        : epreuve.includes("Féminin")
                                        ? "secondary"
                                        : "primary"
                                    }
                                    size="small"
                                  />
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box sx={{ mt: 2 }}>
                                {displayMatches.length === 0 ? (
                                    <Alert severity="info">
                                      Aucun match trouvé pour cette équipe.
                                    </Alert>
                                ) : (
                                  <>
                                    {/* Section : Joueurs par journée */}
                                    <Box sx={{ mb: 4 }}>
                                      <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{ mb: 2 }}
                                      >
                                        👥 Joueurs par journée
                                      </Typography>
                                      <Divider sx={{ mb: 2 }} />
                                      {(() => {
                                        // Grouper les matchs par journée
                                        const matchesByJournee =
                                          displayMatches.reduce(
                                            (acc, match) => {
                                              const journee =
                                                match.journee || 0;
                                              if (!acc[journee]) {
                                                acc[journee] = [];
                                              }
                                              acc[journee].push(match);
                                              return acc;
                                            },
                                            {} as Record<
                                              number,
                                              Match[]
                                            >
                                          );

                                        const journees = Object.keys(
                                          matchesByJournee
                                        )
                                          .map(Number)
                                          .sort((a, b) => a - b);

                                        // Préparer les listes de joueurs par journée pour la comparaison
                                        const joueursParJournee = new Map<
                                          number,
                                          Set<string>
                                        >();

                                        journees.forEach((journee) => {
                                          const matchesJournee =
                                            matchesByJournee[journee];
                                          const joueursSet = new Set<string>();

                                          matchesJournee.forEach((match) => {
                                            if (
                                              match.joueursSQY &&
                                              Array.isArray(match.joueursSQY)
                                            ) {
                                              match.joueursSQY.forEach(
                                                (joueur) => {
                                                  const key =
                                                    joueur.licence ||
                                                    `${joueur.nom}_${joueur.prenom}`;
                                                  joueursSet.add(key);
                                                }
                                              );
                                            }
                                          });

                                          joueursParJournee.set(
                                            journee,
                                            joueursSet
                                          );
                                        });

                                        return (
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 2,
                                            }}
                                          >
                                            {journees.map(
                                              (journee, journeeIndex) => {
                                                const matchesJournee =
                                                  matchesByJournee[journee];
                                                // Collecter tous les joueurs uniques de cette journée
                                                const joueursUniques = new Map<
                                                  string,
                                                  {
                                                    licence?: string;
                                                    nom?: string;
                                                    prenom?: string;
                                                    points?: number | null;
                                                    sexe?: string;
                                                    matches: number;
                                                    status?:
                                                      | "nouveau"
                                                      | "retire"
                                                      | "present";
                                                  }
                                                >();

                                                matchesJournee.forEach(
                                                  (match) => {
                                                    if (
                                                      match.joueursSQY &&
                                                      Array.isArray(
                                                        match.joueursSQY
                                                      )
                                                    ) {
                                                      match.joueursSQY.forEach(
                                                        (joueur) => {
                                                          const key =
                                                            joueur.licence ||
                                                            `${joueur.nom}_${joueur.prenom}`;
                                                          if (
                                                            !joueursUniques.has(
                                                              key
                                                            )
                                                          ) {
                                                            const joueurData: {
                                                              licence?: string;
                                                              nom?: string;
                                                              prenom?: string;
                                                              points?:
                                                                | number
                                                                | null;
                                                              sexe?: string;
                                                              matches: number;
                                                              status?:
                                                                | "nouveau"
                                                                | "retire"
                                                                | "present";
                                                            } = {
                                                              matches: 0,
                                                            };
                                                            if (
                                                              joueur.licence !==
                                                              undefined
                                                            )
                                                              joueurData.licence =
                                                                joueur.licence;
                                                            if (
                                                              joueur.nom !==
                                                              undefined
                                                            )
                                                              joueurData.nom =
                                                                joueur.nom;
                                                            if (
                                                              joueur.prenom !==
                                                              undefined
                                                            )
                                                              joueurData.prenom =
                                                                joueur.prenom;
                                                            if (
                                                              joueur.points !==
                                                              undefined
                                                            )
                                                              joueurData.points =
                                                                joueur.points;
                                                            if (
                                                              joueur.sexe !==
                                                              undefined
                                                            )
                                                              joueurData.sexe =
                                                                joueur.sexe;
                                                            joueursUniques.set(
                                                              key,
                                                              joueurData
                                                            );
                                                          }
                                                          const existing =
                                                            joueursUniques.get(
                                                              key
                                                            )!;
                                                          existing.matches += 1;
                                                        }
                                                      );
                                                    }
                                                  }
                                                );

                                                // Déterminer le statut de chaque joueur par rapport à la journée précédente
                                                const journeePrecedente =
                                                  journeeIndex > 0
                                                    ? journees[journeeIndex - 1]
                                                    : null;
                                                const joueursJourneeActuelle =
                                                  joueursParJournee.get(
                                                    journee
                                                  ) || new Set<string>();
                                                const joueursJourneePrecedente =
                                                  journeePrecedente
                                                    ? joueursParJournee.get(
                                                        journeePrecedente
                                                      ) || new Set<string>()
                                                    : new Set<string>();

                                                joueursUniques.forEach(
                                                  (joueur) => {
                                                    const key =
                                                      joueur.licence ||
                                                      `${joueur.nom}_${joueur.prenom}`;

                                                    if (!journeePrecedente) {
                                                      // Première journée : tous les joueurs sont nouveaux
                                                      joueur.status = "nouveau";
                                                    } else {
                                                      const presentActuel =
                                                        joueursJourneeActuelle.has(
                                                          key
                                                        );
                                                      const presentPrecedent =
                                                        joueursJourneePrecedente.has(
                                                          key
                                                        );

                                                      if (
                                                        presentActuel &&
                                                        !presentPrecedent
                                                      ) {
                                                        joueur.status =
                                                          "nouveau";
                                                      } else if (
                                                        presentActuel &&
                                                        presentPrecedent
                                                      ) {
                                                        joueur.status =
                                                          "present";
                                                      } else {
                                                        joueur.status =
                                                          "present"; // Par défaut si présent actuellement
                                                      }
                                                    }
                                                  }
                                                );

                                                const getChipColor = (joueur: {
                                                  status?:
                                                    | "nouveau"
                                                    | "retire"
                                                    | "present";
                                                  licence?: string;
                                                }) => {
                                                  if (!joueur.status)
                                                    return joueur.licence
                                                      ? "primary.main"
                                                      : "warning.main";

                                                  switch (joueur.status) {
                                                    case "nouveau":
                                                      return "success.main"; // Vert pour les nouveaux joueurs
                                                    case "retire":
                                                      return "error.main"; // Rouge pour les joueurs retirés
                                                    case "present":
                                                    default:
                                                      return joueur.licence
                                                        ? "primary.main"
                                                        : "warning.main"; // Bleu par défaut pour les joueurs présents
                                                  }
                                                };

                                                return (
                                                  <Card
                                                    key={journee}
                                                    variant="outlined"
                                                    sx={{ p: 2 }}
                                                  >
                                                    <Typography
                                                      variant="subtitle1"
                                                      sx={{
                                                        fontWeight: "bold",
                                                        mb: 1,
                                                      }}
                                                    >
                                                      Journée {journee}
                                                    </Typography>
                                                    {joueursUniques.size ===
                                                    0 ? (
                                                      <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                      >
                                                        Aucun joueur trouvé pour
                                                        cette journée
                                                      </Typography>
                                                    ) : (
                                                      <Box
                                                        sx={{
                                                          display: "flex",
                                                          flexWrap: "wrap",
                                                          gap: 1,
                                                        }}
                                                      >
                                                        {Array.from(
                                                          joueursUniques.values()
                                                        )
                                                          .sort((a, b) => {
                                                            // Trier par nom puis prénom
                                                            const nomA = (
                                                              a.nom || ""
                                                            ).toLowerCase();
                                                            const nomB = (
                                                              b.nom || ""
                                                            ).toLowerCase();
                                                            if (nomA !== nomB)
                                                              return nomA.localeCompare(
                                                                nomB
                                                              );
                                                            const prenomA = (
                                                              a.prenom || ""
                                                            ).toLowerCase();
                                                            const prenomB = (
                                                              b.prenom || ""
                                                            ).toLowerCase();
                                                            return prenomA.localeCompare(
                                                              prenomB
                                                            );
                                                          })
                                                          .map(
                                                            (joueur, idx) => (
                                                              <Chip
                                                                key={idx}
                                                                label={`${
                                                                  joueur.prenom ||
                                                                  ""
                                                                } ${
                                                                  joueur.nom ||
                                                                  ""
                                                                }${
                                                                  joueur.licence
                                                                    ? ` (${joueur.licence})`
                                                                    : ""
                                                                }`}
                                                                variant="outlined"
                                                                size="small"
                                                                sx={{
                                                                  borderColor:
                                                                    getChipColor(
                                                                      joueur
                                                                    ),
                                                                  bgcolor:
                                                                    joueur.status ===
                                                                    "nouveau"
                                                                      ? "success.light"
                                                                      : joueur.status ===
                                                                        "present"
                                                                      ? "transparent"
                                                                      : "transparent",
                                                                  fontWeight:
                                                                    joueur.status ===
                                                                    "nouveau"
                                                                      ? "bold"
                                                                      : "normal",
                                                                }}
                                                              />
                                                            )
                                                          )}
                                                      </Box>
                                                    )}
                                                  </Card>
                                                );
                                              }
                                            )}
                                          </Box>
                                        );
                                      })()}
                                    </Box>

                                    <Divider sx={{ my: 3 }} />

                                    {/* Section : Liste des matchs */}
                                    <Typography
                                      variant="h6"
                                      gutterBottom
                                      sx={{ mb: 2 }}
                                    >
                                      📅 Matchs
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 2,
                                      }}
                                    >
                                      {displayMatches
                                        .sort(
                                          (a, b) =>
                                            new Date(a.date).getTime() -
                                            new Date(b.date).getTime()
                                        )
                                        .map((match, index) => (
                                          <Box
                                            sx={{
                                              width: { xs: "100%", md: "50%" },
                                            }}
                                            key={`${match.ffttId}_${index}`}
                                          >
                                            <Card
                                              variant="outlined"
                                              sx={{
                                                height: "100%",
                                                cursor:
                                                  match.resultatsIndividuels
                                                    ? "pointer"
                                                    : "default",
                                                transition:
                                                  "all 0.2s ease-in-out",
                                                "&:hover":
                                                  match.resultatsIndividuels
                                                    ? {
                                                        boxShadow: 3,
                                                        transform:
                                                          "translateY(-2px)",
                                                      }
                                                    : {},
                                              }}
                                              onClick={() =>
                                                handleMatchClick(match)
                                              }
                                            >
                                              <CardContent>
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "flex-start",
                                                    mb: 2,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    <Typography
                                                      variant="h6"
                                                      component="div"
                                                    >
                                                      Journée {match.journee}
                                                    </Typography>
                                                    {match.resultatsIndividuels && (
                                                      <Info
                                                        sx={{
                                                          ml: 1,
                                                          color: "primary.main",
                                                          fontSize: 20,
                                                        }}
                                                      />
                                                    )}
                                                  </Box>
                                                  {getMatchStatusChip(match)}
                                                </Box>

                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    mb: 2,
                                                  }}
                                                >
                                                  {match.isHome ? (
                                                    <Home
                                                      sx={{
                                                        mr: 1,
                                                        color: "primary.main",
                                                      }}
                                                    />
                                                  ) : (
                                                    <FlightTakeoff
                                                      sx={{
                                                        mr: 1,
                                                        color: "secondary.main",
                                                      }}
                                                    />
                                                  )}
                                                  <Typography
                                                    variant="body1"
                                                    sx={{ fontWeight: "bold" }}
                                                  >
                                                    {match.isHome
                                                      ? "À domicile"
                                                      : "À l'extérieur"}
                                                  </Typography>
                                                </Box>

                                                <Typography
                                                  variant="body1"
                                                  sx={{ mb: 1 }}
                                                >
                                                  <strong>Adversaire:</strong>{" "}
                                                  {match.opponent}
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  color="text.secondary"
                                                  sx={{ mb: 1 }}
                                                >
                                                  <strong>Date:</strong>{" "}
                                                  {formatDate(match.date)}
                                                </Typography>
                                                {formatTime(match.date) && (
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                  >
                                                    <strong>Heure:</strong>{" "}
                                                    {formatTime(match.date)}
                                                  </Typography>
                                                )}
                                                <Typography
                                                  variant="body2"
                                                  color="text.secondary"
                                                  sx={{ mb: 1 }}
                                                >
                                                  <strong>Lieu:</strong>{" "}
                                                  {match.location}
                                                </Typography>
                                                <Typography
                                                  variant="body2"
                                                  color="text.secondary"
                                                  sx={{ mb: 1 }}
                                                >
                                                  <strong>Phase:</strong>{" "}
                                                  {match.phase}
                                                </Typography>
                                                {match.score && (
                                                  <Typography
                                                    variant="body1"
                                                    sx={{
                                                      mb: 1,
                                                      fontWeight: "bold",
                                                      color:
                                                        match.result ===
                                                        "VICTOIRE"
                                                          ? "success.main"
                                                          : match.result ===
                                                            "DEFAITE"
                                                          ? "error.main"
                                                          : "text.primary",
                                                    }}
                                                  >
                                                    <strong>Score:</strong>{" "}
                                                    {match.score}
                                                  </Typography>
                                                )}
                                                {match.rencontreId && (
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                  >
                                                    <strong>
                                                      ID Rencontre:
                                                    </strong>{" "}
                                                    {match.rencontreId}
                                                  </Typography>
                                                )}
                                                {match.equipeIds && (
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                  >
                                                    <strong>
                                                      IDs Équipes:
                                                    </strong>{" "}
                                                    {match.equipeIds.equipe1} vs{" "}
                                                    {match.equipeIds.equipe2}
                                                  </Typography>
                                                )}
                                                {match.resultatsIndividuels && (
                                                  <Typography
                                                    variant="body2"
                                                    color="primary.main"
                                                    sx={{
                                                      mb: 1,
                                                      fontStyle: "italic",
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    💡 Cliquez pour voir les
                                                    détails du match
                                                  </Typography>
                                                )}
                                              </CardContent>
                                            </Card>
                                          </Box>
                                        ))}
                                    </Box>
                                  </>
                                )}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                          );
                        })
                    )}
                  </Box>
                )
            )}
          </Box>
        )}

        {/* Modal pour afficher les détails du match */}
        <Dialog
          open={modalOpen}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h5" component="div">
                Détails du match
              </Typography>
              <Button
                onClick={handleCloseModal}
                sx={{ minWidth: "auto", p: 1 }}
              >
                <Close />
              </Button>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            {selectedMatch && (
              <Box>
                {/* Informations générales */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Informations générales
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <Box sx={{ width: "50%" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Journée:</strong> {selectedMatch.journee}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "50%" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Phase:</strong> {selectedMatch.phase}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "50%" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Date:</strong> {formatDate(selectedMatch.date)}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "50%" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Lieu:</strong> {selectedMatch.location}
                      </Typography>
                    </Box>
                    <Box sx={{ width: "100%" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Adversaire:</strong> {selectedMatch.opponent}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Résultat */}
                {selectedMatch.score && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Résultat
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        p: 2,
                        bgcolor:
                          selectedMatch.result === "VICTOIRE"
                            ? "success.light"
                            : selectedMatch.result === "DEFAITE" ||
                              selectedMatch.result === "DÉFAITE"
                            ? "error.light"
                            : "grey.100",
                        borderRadius: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                        {selectedMatch.score}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {selectedMatch.result}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Compositions des équipes */}
                {selectedMatch.resultatsIndividuels && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Compositions des équipes
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {/* Équipe A */}
                      <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: "primary.light",
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ mb: 2, color: "primary.contrastText" }}
                          >
                            {selectedMatch.resultatsIndividuels.nomEquipeA ||
                              "Équipe A"}
                          </Typography>
                          {selectedMatch.resultatsIndividuels.joueursA &&
                            Object.entries(
                              selectedMatch.resultatsIndividuels.joueursA
                            ).map(([nomComplet, joueur]) => {
                              const typedJoueur = joueur as {
                                nom: string;
                                prenom: string;
                                points: number;
                                licence?: string;
                              };
                              return (
                                <Box
                                  key={nomComplet}
                                  sx={{
                                    mb: 1,
                                    p: 1,
                                    bgcolor: "white",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {typedJoueur.prenom} {typedJoueur.nom}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {typedJoueur.licence
                                      ? `Licence: ${typedJoueur.licence} • `
                                      : ""}
                                    Points: {typedJoueur.points}
                                  </Typography>
                                </Box>
                              );
                            })}
                        </Box>
                      </Box>

                      {/* Équipe B */}
                      <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: "secondary.light",
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ mb: 2, color: "secondary.contrastText" }}
                          >
                            {selectedMatch.resultatsIndividuels.nomEquipeB ||
                              "Équipe B"}
                          </Typography>
                          {selectedMatch.resultatsIndividuels.joueursB &&
                            Object.entries(
                              selectedMatch.resultatsIndividuels.joueursB
                            ).map(([nomComplet, joueur]) => {
                              const typedJoueur = joueur as {
                                nom: string;
                                prenom: string;
                                points: number;
                                licence?: string;
                              };
                              return (
                                <Box
                                  key={nomComplet}
                                  sx={{
                                    mb: 1,
                                    p: 1,
                                    bgcolor: "white",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {typedJoueur.prenom} {typedJoueur.nom}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Licence: {typedJoueur.licence || "N/A"} •
                                    Points: {typedJoueur.points}
                                  </Typography>
                                </Box>
                              );
                            })}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Résultats des parties individuelles */}
                {selectedMatch.resultatsIndividuels && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Résultats des parties
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {selectedMatch.resultatsIndividuels.parties &&
                      selectedMatch.resultatsIndividuels.parties.map(
                        (partie, index: number) => {
                          return (
                            <Box
                              key={index}
                              sx={{
                                mb: 2,
                                p: 2,
                                border: 1,
                                borderColor: "grey.300",
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{ mb: 2, textAlign: "center" }}
                              >
                                Partie {index + 1}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 2,
                                  alignItems: "center",
                                }}
                              >
                                <Box sx={{ width: "41.67%" }}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: "bold",
                                      textAlign: "right",
                                    }}
                                  >
                                    {partie.adversaireA || partie.joueurA}
                                  </Typography>
                                </Box>
                                <Box sx={{ width: "16.67%" }}>
                                  <Typography
                                    variant="h5"
                                    sx={{
                                      textAlign: "center",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {partie.scoreA} - {partie.scoreB}
                                  </Typography>
                                </Box>
                                <Box sx={{ width: "41.67%" }}>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {partie.adversaireB || partie.joueurB}
                                  </Typography>
                                </Box>
                              </Box>
                              {partie.setDetails &&
                                partie.setDetails.length > 0 && (
                                  <Box sx={{ mt: 2, textAlign: "center" }}>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Sets: {partie.setDetails.join(" - ")}
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          );
                        }
                      )}
                    {!selectedMatch.resultatsIndividuels.parties && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", py: 2 }}
                      >
                        Aucun détail de partie disponible
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseModal} variant="contained">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de modification du lieu d'une équipe */}
        <Dialog
          open={editingTeamLocation !== null}
          onClose={() => {
            if (!updatingLocation) {
              setEditingTeamLocation(null);
              setSelectedLocationId(null);
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Modifier le lieu de l&apos;équipe</DialogTitle>
          <DialogContent>
            {editingTeamLocation && (
              <Box sx={{ pt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Lieu</InputLabel>
                  <Select
                    value={selectedLocationId || ""}
                    label="Lieu"
                    onChange={(e) => {
                      const locationId =
                        e.target.value === "" ? null : e.target.value;
                      setSelectedLocationId(locationId);
                    }}
                    disabled={updatingLocation === editingTeamLocation}
                  >
                    <MenuItem value="">
                      <em>Aucun lieu</em>
                    </MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {updatingLocation === editingTeamLocation && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditingTeamLocation(null);
                setSelectedLocationId(null);
              }}
              disabled={updatingLocation === editingTeamLocation}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveLocation}
              variant="contained"
              disabled={updatingLocation === editingTeamLocation}
            >
              {updatingLocation === editingTeamLocation
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de modification du canal Discord d'une équipe */}
        <Dialog
          open={editingTeamDiscordChannel !== null}
          onClose={() => {
            if (!updatingDiscordChannel) {
              setEditingTeamDiscordChannel(null);
              setSelectedDiscordChannelId(null);
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTeamDiscordChannel
              ? (() => {
                  const equipe = equipes.find(
                    (e) => e.team.id === editingTeamDiscordChannel
                  );
                  if (!equipe) return "Modifier le canal Discord de l'équipe";
                  const isFemale =
                    equipe.matches[0]?.epreuve?.includes("Féminin") || false;
                  return `Modifier le canal Discord - ${equipe.team.name} (${
                    isFemale ? "Féminin" : "Masculin"
                  })`;
                })()
              : "Modifier le canal Discord de l'équipe"}
          </DialogTitle>
          <DialogContent>
            {editingTeamDiscordChannel && (
              <Box sx={{ pt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Canal Discord</InputLabel>
                  <Select
                    value={selectedDiscordChannelId || ""}
                    label="Canal Discord"
                    onChange={(e) => {
                      const channelId =
                        e.target.value === "" ? null : e.target.value;
                      setSelectedDiscordChannelId(channelId);
                    }}
                    disabled={
                      updatingDiscordChannel === editingTeamDiscordChannel ||
                      loadingDiscordChannels
                    }
                  >
                    <MenuItem value="">
                      <em>Aucun canal</em>
                    </MenuItem>
                    {discordChannelsHierarchy.length > 0
                      ? // Afficher avec la hiérarchie (catégories)
                        discordChannelsHierarchy.flatMap((group) => [
                          ...(group.category
                            ? [
                                <MenuItem
                                  key={`category-${group.category.id}`}
                                  disabled
                                  sx={{ fontWeight: "bold", opacity: 1 }}
                                >
                                  📁 {group.category.name}
                                </MenuItem>,
                              ]
                            : []),
                          ...group.channels.map((channel) => (
                            <MenuItem
                              key={channel.id}
                              value={channel.id}
                              sx={{ pl: group.category ? 4 : 2 }}
                            >
                              {group.category ? "  " : ""}#{channel.name}
                            </MenuItem>
                          )),
                        ])
                      : // Fallback : affichage plat si pas de hiérarchie
                        discordChannels.map((channel) => (
                          <MenuItem key={channel.id} value={channel.id}>
                            #{channel.name}
                          </MenuItem>
                        ))}
                  </Select>
                </FormControl>
                {loadingDiscordChannels && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
                {updatingDiscordChannel === editingTeamDiscordChannel && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditingTeamDiscordChannel(null);
                setSelectedDiscordChannelId(null);
              }}
              disabled={updatingDiscordChannel === editingTeamDiscordChannel}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveDiscordChannel}
              variant="contained"
              disabled={
                updatingDiscordChannel === editingTeamDiscordChannel ||
                loadingDiscordChannels
              }
            >
              {updatingDiscordChannel === editingTeamDiscordChannel
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AuthGuard>
  );
}
