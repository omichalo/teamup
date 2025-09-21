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
} from "@omichalo/sqyping-mui-theme";
import {
  SportsTennis as PingPongIcon,
  Event as EventIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useFFTTData } from "@/hooks/useFFTTData";
import { usePlayers } from "@/hooks/usePlayers";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Match, Player, Team } from "@/types";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isCoach } = useAuth();
  const { matches: upcomingMatches, teams, loading, error } = useFFTTData();
  const { players, loading: playersLoading } = usePlayers();
  const router = useRouter();

  if (loading || playersLoading) {
    return (
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tableau de bord
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bienvenue {user?.displayName} ! Voici un aperçu de votre club SQY
            Ping.
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
                Coordinateur: Joffrey NIZAN • {teams.length} équipes actives
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
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
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

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
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
    </AuthGuard>
  );
}
