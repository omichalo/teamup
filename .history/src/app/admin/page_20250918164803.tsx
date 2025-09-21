"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  CloudSync as CloudSyncIcon,
  SportsTennis as TennisIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";

interface SyncStatus {
  players: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error?: string;
  };
  matches: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error?: string;
  };
}

export default function AdminPage() {
  const { user, firebaseUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    players: { lastSync: null, count: 0, status: "idle" },
    matches: { lastSync: null, count: 0, status: "idle" },
  });
  const [isLoading, setIsLoading] = useState(true);

  // Charger le statut initial au montage du composant
  React.useEffect(() => {
    const loadSyncStatus = async () => {
      if (!user || !firebaseUser) return; // Attendre que l'utilisateur soit connecté

      setIsLoading(true);
      try {
        // Récupérer le token d'authentification
        const token = await firebaseUser.getIdToken();

        const response = await fetch("/api/admin/sync-status", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();

        if (response.ok && result.success) {
          setSyncStatus({
            players: {
              lastSync: result.data?.players?.lastSync || null,
              count: result.data?.players?.count || 0,
              status: "idle",
            },
            matches: {
              lastSync: result.data?.matches?.lastSync || null,
              count: result.data?.matches?.count || 0,
              status: "idle",
            },
          });
        } else {
          console.error("Erreur API:", result.error || result.message);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du statut:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSyncStatus();
  }, [user, firebaseUser]);

  // Pour l'instant, tous les utilisateurs connectés peuvent accéder à l'administration

  const handleSyncPlayers = async () => {
    if (!firebaseUser) {
      console.error("Utilisateur non connecté");
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      players: { ...prev.players, status: "syncing" },
    }));

    try {
      // Récupérer le token d'authentification
      const token = await firebaseUser.getIdToken();

      const response = await fetch("/api/admin/sync-players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          players: {
            lastSync: new Date().toISOString(),
            count: result.data?.playersCount || 0,
            status: "success",
          },
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          players: {
            ...prev.players,
            status: "error",
            error: result.error || result.message || "Erreur inconnue",
          },
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        players: {
          ...prev.players,
          status: "error",
          error: error instanceof Error ? error.message : "Erreur réseau",
        },
      }));
    }
  };

  const handleSyncMatches = async () => {
    if (!firebaseUser) {
      console.error("Utilisateur non connecté");
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      matches: { ...prev.matches, status: "syncing" },
    }));

    try {
      // Récupérer le token d'authentification
      const token = await firebaseUser.getIdToken();

      const response = await fetch("/api/admin/sync-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          matches: {
            lastSync: new Date().toISOString(),
            count: result.data?.matchesCount || 0,
            status: "success",
          },
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          matches: {
            ...prev.matches,
            status: "error",
            error: result.error || result.message || "Erreur inconnue",
          },
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        matches: {
          ...prev.matches,
          status: "error",
          error: error instanceof Error ? error.message : "Erreur réseau",
        },
      }));
    }
  };

  const getStatusChip = (status: SyncStatus["players"]["status"]) => {
    switch (status) {
      case "syncing":
        return (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Synchronisation en cours..."
            color="info"
          />
        );
      case "success":
        return <Chip label="Synchronisé avec succès" color="success" />;
      case "error":
        return <Chip label="Erreur de synchronisation" color="error" />;
      default:
        return <Chip label="Prêt à synchroniser" color="default" />;
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return "Jamais";
    return new Date(lastSync).toLocaleString("fr-FR");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Administration - Synchronisation des données
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gérez la synchronisation des données FFTT depuis cette interface
        d'administration.
      </Typography>

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Chargement des données de synchronisation...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Veuillez patienter pendant que nous récupérons les informations.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Synchronisation des joueurs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <GroupIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">
                    Synchronisation des joueurs
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Synchronise la liste des joueurs du club depuis l'API FFTT.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Dernière synchronisation :</strong>{" "}
                    {formatLastSync(syncStatus.players.lastSync)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre de joueurs :</strong>{" "}
                    {syncStatus.players.count}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" component="span">
                      <strong>Statut :</strong>
                    </Typography>
                    {getStatusChip(syncStatus.players.status)}
                  </Box>
                </Box>

                {syncStatus.players.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {syncStatus.players.error}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  startIcon={
                    syncStatus.players.status === "syncing" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                  onClick={handleSyncPlayers}
                  disabled={syncStatus.players.status === "syncing"}
                  fullWidth
                >
                  {syncStatus.players.status === "syncing"
                    ? "Synchronisation en cours..."
                    : "Synchroniser les joueurs"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Synchronisation des matchs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TennisIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">
                    Synchronisation des matchs
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Synchronise tous les matchs et leurs détails depuis l'API
                  FFTT.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Dernière synchronisation :</strong>{" "}
                    {formatLastSync(syncStatus.matches.lastSync)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre de matchs :</strong>{" "}
                    {syncStatus.matches.count}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" component="span">
                      <strong>Statut :</strong>
                    </Typography>
                    {getStatusChip(syncStatus.matches.status)}
                  </Box>
                </Box>

                {syncStatus.matches.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {syncStatus.matches.error}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  startIcon={
                    syncStatus.matches.status === "syncing" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CloudSyncIcon />
                    )
                  }
                  onClick={handleSyncMatches}
                  disabled={syncStatus.matches.status === "syncing"}
                  fullWidth
                >
                  {syncStatus.matches.status === "syncing"
                    ? "Synchronisation en cours..."
                    : "Synchroniser les matchs"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Informations générales */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <ScheduleIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">
                    Synchronisation automatique
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Les données sont automatiquement synchronisées en arrière-plan
                  :
                </Typography>

                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Joueurs :</strong> Synchronisation quotidienne à
                    6h du matin
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Matchs :</strong> Synchronisation quotidienne à 2h
                    du matin
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Détails des matchs :</strong> Récupération
                    automatique des compositions et résultats
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Note :</strong> La synchronisation manuelle peut
                    prendre plusieurs minutes selon le nombre de données à
                    traiter. Les synchronisations automatiques se font en
                    arrière-plan sans impact sur l'utilisation de l'application.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
