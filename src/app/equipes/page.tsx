"use client";

import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { SportsTennis } from "@mui/icons-material";
import { useTeamData } from "@/hooks/useTeamData";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useAuth } from "@/hooks/useAuth";
import { useTeamManagementStore } from "@/stores/teamManagementStore";
import { isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { getTeamPhase, extractTeamNumber } from "@/lib/shared/fftt-utils";
import { getPhaseOfNextChampionnatEquipesMatch } from "@/lib/shared/phase-utils";
import { EquipeAccordion } from "@/components/equipes/EquipeAccordion";

export default function EquipesPage() {
  const { user } = useAuth();
  const { equipes: initialEquipes, loading, error, currentPhase } = useTeamData();
  const updateTeamInStore = useTeamManagementStore((state) => state.updateTeam);
  const [equipes, setEquipes] = React.useState(initialEquipes);
  const [tabValue, setTabValue] = React.useState(0);
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
  /** true = afficher toutes les phases, false = uniquement la phase par défaut (même logique que dispo/compos) */
  const [showAllPhases, setShowAllPhases] = React.useState(false);

  /** Phase affichée par défaut : prochain match à jouer ou phase en cours (aligné avec dispo/compos) */
  const defaultPhaseToShow = React.useMemo(
    () => getPhaseOfNextChampionnatEquipesMatch(equipes) ?? currentPhase,
    [equipes, currentPhase]
  );

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

  const sortEquipesByTeamNumber = React.useCallback(
    (a: (typeof filteredEquipes)[0], b: (typeof filteredEquipes)[0]) =>
      extractTeamNumber(a.team.name) - extractTeamNumber(b.team.name),
    []
  );

  const groupEquipesByPhase = React.useCallback(
    (equipesList: typeof filteredEquipes) => {
      const phase1: typeof filteredEquipes = [];
      const phase2: typeof filteredEquipes = [];
      const sansPhase: typeof filteredEquipes = [];
      for (const eq of equipesList) {
        const k = getTeamPhase(eq);
        if (k === "phase1") phase1.push(eq);
        else if (k === "phase2") phase2.push(eq);
        else sansPhase.push(eq);
      }
      phase1.sort(sortEquipesByTeamNumber);
      phase2.sort(sortEquipesByTeamNumber);
      sansPhase.sort(sortEquipesByTeamNumber);
      return { phase1, phase2, sansPhase };
    },
    [sortEquipesByTeamNumber]
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
                    color: isParisEpreuve(epreuve) || epreuve.includes("Féminin") ? "secondary.main" : "primary.main",
                    "&.Mui-selected": {
                      color: isParisEpreuve(epreuve) || epreuve.includes("Féminin") ? "secondary.main" : "primary.main",
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
                    ) : (() => {
                      const isParis = isParisEpreuve(epreuve);
                      const sorted = equipesByEpreuve[epreuve]
                        .slice()
                        .sort(sortEquipesByTeamNumber);
                      const grouped = !isParis
                        ? groupEquipesByPhase(equipesByEpreuve[epreuve])
                        : { phase1: [] as typeof sorted, phase2: [] as typeof sorted, sansPhase: [] as typeof sorted };
                      const sections = isParis
                        ? [{ title: null as string | null, equipes: sorted }]
                        : showAllPhases
                          ? [
                              { title: "Phase 1 (Aller)" as string | null, equipes: grouped.phase1 },
                              { title: "Phase 2 (Retour)" as string | null, equipes: grouped.phase2 },
                              ...(grouped.sansPhase.length > 0
                                ? [{ title: "Toutes phases" as string | null, equipes: grouped.sansPhase }]
                                : []),
                            ]
                          : [
                              {
                                title: (defaultPhaseToShow === "aller" ? "Phase 1 (Aller)" : "Phase 2 (Retour)") as string | null,
                                equipes: defaultPhaseToShow === "aller" ? grouped.phase1 : grouped.phase2,
                              },
                            ];
                      return (
                        <>
                          {!isParis && (
                            <Box sx={{ mb: 2 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setShowAllPhases(!showAllPhases)}
                              >
                                {showAllPhases ? "Phase en cours uniquement" : "Voir toutes les phases"}
                              </Button>
                            </Box>
                          )}
                          {sections.map((section, sIdx) => (
                            <React.Fragment key={section.title ?? `section-${sIdx}`}>
                              {section.title != null && (
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                                  {section.title}
                                </Typography>
                              )}
                              {section.equipes.map((equipeWithMatches) => (
                                <EquipeAccordion
                                  key={equipeWithMatches.team.id}
                                  equipeWithMatches={equipeWithMatches}
                                  epreuve={epreuve}
                                  locations={locations}
                                  discordChannels={discordChannels}
                                  user={user}
                                  onOpenLocationDialog={handleOpenLocationDialog}
                                  onOpenDiscordChannelDialog={handleOpenDiscordChannelDialog}
                                />
                              ))}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                  </Box>
                )
            )}
          </Box>
        )}

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
