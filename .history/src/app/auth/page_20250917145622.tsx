'use client';

import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { SportsTennis as PingPongIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();
  const [signInLoading, setSignInLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSignIn = async () => {
    try {
      setSignInLoading(true);
      setError(null);
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setSignInLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #ea580c 100%)',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <PingPongIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h4" component="h1" gutterBottom>
            SQY Ping
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Team Up
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Connectez-vous pour accéder à l'application de gestion des équipes
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSignIn}
            disabled={signInLoading}
            sx={{ mb: 2 }}
          >
            {signInLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Se connecter avec Google'
            )}
          </Button>

          <Typography variant="body2" color="text.secondary">
            En vous connectant, vous acceptez les conditions d'utilisation
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
