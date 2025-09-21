"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SportsTennis as PingPongIcon,
} from "@mui/icons-material";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Player, Team, ClubSettings } from "@/types";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ClubFormData {
  name: string;
  ffttCode: string;
  ffttId: string;
  ffttPassword: string;
}

interface DiscordFormData {
  team1: string;
  team2: string;
  team3: string;
}

export default function SettingsPage() {
  const { user, isCoach } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clubForm = useForm<ClubFormData>({
    defaultValues: {
      name: "",
      ffttCode: "",
      ffttId: "",
      ffttPassword: "",
    },
  });

  const discordForm = useForm<DiscordFormData>({
    defaultValues: {
      team1: "",
      team2: "",
      team3: "",
    },
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    if (!isCoach) {
      router.push("/");
      return;
    }

    loadData();
  }, [user, isCoach, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Simuler le chargement des données
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Données simulées
      const mockPlayers: Player[] = [
        {
          id: "1",
          ffttId: "12345",
          firstName: "Jean",
          lastName: "Dupont",
          points: 1200,
          ranking: 150,
          isForeign: false,
          isTransferred: false,
          isFemale: false,
          teamNumber: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockTeams: Team[] = [
        {
          id: "1",
          number: 1,
          name: "Équipe 1",
          division: "Régionale 1",
          players: ["1"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSettings: ClubSettings = {
        id: "1",
        name: "SQY Ping",
        ffttCode: "12345",
        discordWebhooks: {
          1: "",
          2: "",
          3: "",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setPlayers(mockPlayers);
      setTeams(mockTeams);
      setClubSettings(mockSettings);

      // Pré-remplir les formulaires
      clubForm.reset({
        name: mockSettings.name,
        ffttCode: mockSettings.ffttCode,
        ffttId: "",
        ffttPassword: "",
      });

      discordForm.reset({
        team1: mockSettings.discordWebhooks[1] || "",
        team2: mockSettings.discordWebhooks[2] || "",
        team3: mockSettings.discordWebhooks[3] || "",
      });
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const saveClubSettings = async (data: ClubFormData) => {
    try {
      setSaving(true);
      setError(null);

      // Ici vous feriez l'appel API pour sauvegarder les paramètres du club
      console.log("Saving club settings:", data);

      setSuccess("Paramètres du club sauvegardés avec succès !");
    } catch (error) {
      console.error("Save error:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const saveDiscordSettings = async (data: DiscordFormData) => {
    try {
      setSaving(true);
      setError(null);

      // Ici vous feriez l'appel API pour sauvegarder les webhooks Discord
      console.log("Saving Discord settings:", data);

      setSuccess("Paramètres Discord sauvegardés avec succès !");
    } catch (error) {
      console.error("Save error:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addPlayer = () => {
    setEditingPlayer(null);
    setShowPlayerDialog(true);
  };

  const editPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowPlayerDialog(true);
  };

  const deletePlayer = async (playerId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce joueur ?")) {
      try {
        // Ici vous feriez l'appel API pour supprimer le joueur
        console.log("Deleting player:", playerId);
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        setSuccess("Joueur supprimé avec succès !");
      } catch (error) {
        console.error("Delete error:", error);
        setError("Erreur lors de la suppression");
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Paramètres du club
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Informations du club" />
              <Tab label="API FFTT" />
              <Tab label="Discord" />
              <Tab label="Joueurs" />
              <Tab label="Équipes" />
            </Tabs>
          </Box>

          {/* Informations du club */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={clubForm.handleSubmit(saveClubSettings)}>
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <Controller
                    name="name"
                    control={clubForm.control}
                    rules={{ required: "Le nom du club est requis" }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Nom du club"
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Controller
                    name="ffttCode"
                    control={clubForm.control}
                    rules={{ required: "Le code FFTT est requis" }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Code FFTT"
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* API FFTT */}
          <TabPanel value={tabValue} index={1}>
            <form onSubmit={clubForm.handleSubmit(saveClubSettings)}>
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <Controller
                    name="ffttId"
                    control={clubForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Identifiant FFTT"
                        fullWidth
                        type="password"
                        helperText="Identifiant pour l'API FFTT"
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Controller
                    name="ffttPassword"
                    control={clubForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Mot de passe FFTT"
                        fullWidth
                        type="password"
                        helperText="Mot de passe pour l'API FFTT"
                      />
                    )}
                  />
                </Grid>

                <Grid xs={12}>
                  <Alert severity="info">
                    Ces identifiants sont utilisés pour récupérer
                    automatiquement les données des joueurs et des matches
                    depuis l'API officielle de la FFTT.
                  </Alert>
                </Grid>

                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* Discord */}
          <TabPanel value={tabValue} index={2}>
            <form onSubmit={discordForm.handleSubmit(saveDiscordSettings)}>
              <Grid container spacing={3}>
                {teams.map((team) => (
                  <Grid item xs={12} md={6} key={team.id}>
                    <Controller
                      name={`team${team.number}` as keyof DiscordFormData}
                      control={discordForm.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={`Webhook Discord - ${team.name}`}
                          fullWidth
                          placeholder="https://discord.com/api/webhooks/..."
                          helperText={`URL du webhook pour l'équipe ${team.number}`}
                        />
                      )}
                    />
                  </Grid>
                ))}

                <Grid xs={12}>
                  <Alert severity="info">
                    Configurez les webhooks Discord pour chaque équipe afin
                    d'envoyer automatiquement les convocations aux joueurs.
                  </Alert>
                </Grid>

                <Grid xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* Joueurs */}
          <TabPanel value={tabValue} index={3}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Gestion des joueurs</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addPlayer}
              >
                Ajouter un joueur
              </Button>
            </Box>

            <List>
              {players.map((player, index) => (
                <React.Fragment key={player.id}>
                  <ListItem>
                    <PingPongIcon sx={{ mr: 2, color: "primary.main" }} />
                    <ListItemText
                      primary={`${player.firstName} ${player.lastName}`}
                      secondary={
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          <Chip label={`${player.points} pts`} size="small" />
                          <Chip
                            label={`#${player.ranking}`}
                            size="small"
                            variant="outlined"
                          />
                          {player.isFemale && (
                            <Chip
                              label="Féminin"
                              size="small"
                              color="secondary"
                            />
                          )}
                          {player.isForeign && (
                            <Chip
                              label="Étranger"
                              size="small"
                              color="warning"
                            />
                          )}
                          {player.isTransferred && (
                            <Chip label="Muté" size="small" color="info" />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => editPlayer(player)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deletePlayer(player.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < players.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>

          {/* Équipes */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom>
              Gestion des équipes
            </Typography>

            <List>
              {teams.map((team, index) => (
                <React.Fragment key={team.id}>
                  <ListItem>
                    <ListItemText
                      primary={team.name}
                      secondary={`Division: ${team.division} - ${team.players.length} joueurs`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton>
                        <EditIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < teams.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>
        </Card>
      </Box>
    </Layout>
  );
}
