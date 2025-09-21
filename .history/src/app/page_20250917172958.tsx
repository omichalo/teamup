"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  SportsTennis as PingPongIcon,
  Event as EventIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Match, Player, Team } from "@/types";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isCoach } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les vraies données depuis l'API FFTT
      console.log("Chargement des données réelles SQY Ping...");

      // Récupérer les équipes/matches depuis l'API FFTT
      const matchesResponse = await fetch("/api/fftt/matches?clubCode=08781477");
      if (matchesResponse.ok) {
        const ffttMatches = await matchesResponse.json();
        console.log(`${ffttMatches.length} équipes récupérées depuis l'API FFTT`);
        
        // Transformer les données FFTT en format interne
        const transformedMatches: Match[] = ffttMatches.map((ffttMatch: any, index: number) => ({
          id: ffttMatch.ffttId,
          ffttId: ffttMatch.ffttId,
          teamNumber: ffttMatch.teamNumber,
          opponent: ffttMatch.opponent,
          opponentClub: ffttMatch.opponentClub,
          date: new Date(ffttMatch.date),
          location: ffttMatch.location,
          isHome: ffttMatch.isHome,
          isExempt: ffttMatch.isExempt,
          isForfeit: ffttMatch.isForfeit,
          phase: ffttMatch.phase,
          journee: ffttMatch.journee,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        setUpcomingMatches(transformedMatches.slice(0, 5)); // Afficher les 5 premières équipes

        // Créer des équipes basées sur les données FFTT
        const transformedTeams: Team[] = ffttMatches.map((ffttMatch: any, index: number) => ({
          id: `sqyping_team_${ffttMatch.teamNumber}`,
          number: ffttMatch.teamNumber,
          name: `SQY PING ${ffttMatch.teamNumber}`,
          division: extractDivisionFromOpponent(ffttMatch.opponent),
          players: [], // Les joueurs seront ajoutés manuellement
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        setTeams(transformedTeams.slice(0, 10)); // Afficher les 10 premières équipes
      } else {
        console.error("Erreur récupération matches:", matchesResponse.status);
        setError("Impossible de récupérer les données des équipes");
      }

      // Pour l'instant, garder des joueurs de test
      // TODO: Récupérer les vrais joueurs depuis l'API FFTT
      setPlayers([
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
      ]);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Fonction helper pour extraire la division depuis le nom de l'équipe
  const extractDivisionFromOpponent = (opponent: string): string => {
    if (opponent.includes("Nationale 2")) return "Nationale 2";
    if (opponent.includes("PN")) return "Pré-Nationale";
    if (opponent.includes("R1")) return "Régionale 1";
    if (opponent.includes("R2")) return "Régionale 2";
    if (opponent.includes("R3")) return "Régionale 3";
    if (opponent.includes("Départementale 1")) return "Départementale 1";
    if (opponent.includes("Départementale 2")) return "Départementale 2";
    if (opponent.includes("Départementale 3")) return "Départementale 3";
    if (opponent.includes("Départementale 4")) return "Départementale 4";
    return "Division inconnue";
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
          Tableau de bord
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bienvenue {user?.displayName} ! Voici un aperçu de votre club SQY Ping.
        </Typography>

        {/* Informations du club */}
        <Card sx={{ mb: 3, bgcolor: "primary.main", color: "white" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <PingPongIcon sx={{ mr: 1, fontSize: 32 }} />
              <Box>
                <Typography variant="h5" component="h2">
                  SQY PING
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Gymnase des Pyramides • Voisins-le-Bretonneux
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Coordinateur: Joffrey NIZAN • 26 équipes actives
            </Typography>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Prochains matches */}
          <Grid xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <EventIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Prochains matches</Typography>
                </Box>

                {upcomingMatches.length > 0 ? (
                  <List>
                    {upcomingMatches.slice(0, 3).map((match) => (
                      <ListItem key={match.id} divider>
                        <ListItemIcon>
                          <PingPongIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Équipe ${match.teamNumber} vs ${match.opponent}`}
                          secondary={`${match.date.toLocaleDateString(
                            "fr-FR"
                          )} - ${match.location}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    Aucun match prévu
                  </Typography>
                )}

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => router.push("/compositions")}
                >
                  Voir toutes les compositions
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Disponibilités */}
          <Grid xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <GroupIcon sx={{ mr: 1, color: "secondary.main" }} />
                  <Typography variant="h6">Disponibilités</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Joueurs disponibles cette semaine:
                  </Typography>
                  <Chip
                    label={`${players.length} joueurs`}
                    color="success"
                    size="small"
                  />
                </Box>

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => router.push("/disponibilites")}
                >
                  Gérer les disponibilités
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Classement des équipes */}
          <Grid xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 1, color: "success.main" }} />
                  <Typography variant="h6">Classement des équipes</Typography>
                </Box>

                {teams.length > 0 ? (
                  <List>
                    {teams.map((team) => (
                      <ListItem key={team.id} divider>
                        <ListItemText
                          primary={team.name}
                          secondary={`Division: ${team.division}`}
                        />
                        <Chip
                          label={`Équipe ${team.number}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                    {teams.length > 10 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        ... et {teams.length - 10} autres équipes
                      </Typography>
                    )}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    Aucune équipe configurée
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Actions rapides */}
          <Grid xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
                  <Typography variant="h6">Actions rapides</Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => router.push("/compositions")}
                  >
                    Créer une composition
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => router.push("/disponibilites")}
                  >
                    Vérifier les disponibilités
                  </Button>

                  {isCoach && (
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => router.push("/settings")}
                    >
                      Paramètres du club
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
