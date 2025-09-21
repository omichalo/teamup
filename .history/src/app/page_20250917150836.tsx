'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  SportsTennis as PingPongIcon,
  Event as EventIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Match, Player, Team } from '@/types';
import { useRouter } from 'next/navigation';

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
      router.push('/auth');
      return;
    }

    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simuler le chargement des données
      // Dans une vraie application, vous feriez des appels API ici
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Données simulées pour la démonstration
      setUpcomingMatches([
        {
          id: '1',
          ffttId: 'match1',
          teamNumber: 1,
          opponent: 'Club de Test',
          opponentClub: 'Club de Test',
          date: new Date('2024-01-20T14:00:00'),
          location: 'Gymnase Municipal',
          isHome: true,
          isExempt: false,
          isForfeit: false,
          phase: 'aller',
          journee: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      setPlayers([
        {
          id: '1',
          ffttId: '12345',
          firstName: 'Jean',
          lastName: 'Dupont',
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

      setTeams([
        {
          id: '1',
          number: 1,
          name: 'Équipe 1',
          division: 'Régionale 1',
          players: ['1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
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
          Bienvenue {user?.displayName} ! Voici un aperçu de votre club.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Prochains matches */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
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
                          secondary={`${match.date.toLocaleDateString('fr-FR')} - ${match.location}`}
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
                  onClick={() => router.push('/compositions')}
                >
                  Voir toutes les compositions
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Disponibilités */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GroupIcon sx={{ mr: 1, color: 'secondary.main' }} />
                  <Typography variant="h6">Disponibilités</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
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
                  onClick={() => router.push('/disponibilites')}
                >
                  Gérer les disponibilités
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Classement des équipes */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
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
                          label={`${team.players.length} joueurs`}
                          size="small"
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
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
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">Actions rapides</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => router.push('/compositions')}
                  >
                    Créer une composition
                  </Button>
                  
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => router.push('/disponibilites')}
                  >
                    Vérifier les disponibilités
                  </Button>
                  
                  {isCoach && (
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => router.push('/settings')}
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