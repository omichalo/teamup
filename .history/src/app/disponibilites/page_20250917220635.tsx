"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useFirestorePlayers } from "@/hooks/useFirestorePlayers";
import { useJournees } from "@/hooks/useJournees";
import { Player, Availability } from "@/types";
import { useRouter } from "next/navigation";

interface PlayerAvailability {
  playerId: string;
  player: Player;
  availabilities: { [journee: number]: boolean };
  reasons: { [journee: number]: string };
}

export default function DisponibilitesPage() {
  const { user, isCoach } = useAuth();
  const router = useRouter();
  const { players, loading, error } = useFirestorePlayers(100); // Récupérer les 100 meilleurs joueurs
  const { journees, loading: journeesLoading, error: journeesError } = useJournees();
  const [playerAvailabilities, setPlayerAvailabilities] = useState<
    PlayerAvailability[]
  >([]);
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerAvailability | null>(null);
  const [reasonText, setReasonText] = useState("");

  const journees = [1, 2, 3, 4, 5, 6]; // Nombre de journées dans la phase

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
  }, [user, router]);

  // Initialiser les disponibilités quand les joueurs sont chargés
  useEffect(() => {
    if (players.length > 0) {
      const initialAvailabilities: PlayerAvailability[] = players.map(
        (player) => ({
          playerId: player.id,
          player,
          availabilities: {},
          reasons: {},
        })
      );
      setPlayerAvailabilities(initialAvailabilities);
    }
  }, [players]);

  // Sélectionner automatiquement la première journée disponible
  useEffect(() => {
    if (journees.length > 0 && selectedJournee === null) {
      setSelectedJournee(journees[0].number);
    }
  }, [journees, selectedJournee]);

  const handleAvailabilityChange = (
    playerId: string,
    journee: number,
    isAvailable: boolean
  ) => {
    setPlayerAvailabilities((prev) =>
      prev.map((pa) =>
        pa.playerId === playerId
          ? {
              ...pa,
              availabilities: {
                ...pa.availabilities,
                [journee]: isAvailable,
              },
              reasons: isAvailable
                ? { ...pa.reasons, [journee]: "" }
                : pa.reasons,
            }
          : pa
      )
    );

    // Si le joueur devient indisponible, ouvrir le dialog pour la raison
    if (!isAvailable) {
      const player = playerAvailabilities.find(
        (pa) => pa.playerId === playerId
      );
      if (player) {
        setSelectedPlayer(player);
        setSelectedJournee(journee);
        setReasonText(player.reasons[journee] || "");
        setShowReasonDialog(true);
      }
    }
  };

  const handleReasonSave = () => {
    if (!selectedPlayer) return;

    setPlayerAvailabilities((prev) =>
      prev.map((pa) =>
        pa.playerId === selectedPlayer.playerId
          ? {
              ...pa,
              reasons: {
                ...pa.reasons,
                [selectedJournee]: reasonText,
              },
            }
          : pa
      )
    );

    setShowReasonDialog(false);
    setSelectedPlayer(null);
    setReasonText("");
  };

  const saveAvailabilities = async () => {
    try {
      // Ici vous feriez l'appel API pour sauvegarder les disponibilités
      console.log("Saving availabilities:", playerAvailabilities);

      // Afficher un message de succès
      alert("Disponibilités sauvegardées avec succès !");
    } catch (error) {
      console.error("Save error:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const getAvailabilityStats = () => {
    const stats: { [journee: number]: { available: number; total: number } } =
      {};

    journees.forEach((journee) => {
      const available = playerAvailabilities.filter(
        (pa) => pa.availabilities[journee] === true
      ).length;

      stats[journee] = {
        available,
        total: players.length,
      };
    });

    return stats;
  };

  const getAvailabilityColor = (isAvailable: boolean | undefined) => {
    if (isAvailable === undefined) return "default";
    return isAvailable ? "success" : "error";
  };

  const totalLoading = loading || journeesLoading;

  if (totalLoading) {
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
          <Typography variant="h6" sx={{ ml: 2 }}>
            Chargement des données...
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (error || journeesError) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Erreur lors du chargement des données : {error || journeesError}
          </Alert>
        </Box>
      </Layout>
    );
  }

  if (players.length === 0) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            Aucun joueur trouvé. Vérifiez que la synchronisation FFTT a bien été
            effectuée.
          </Alert>
        </Box>
      </Layout>
    );
  }

  const stats = getAvailabilityStats();

  return (
    <Layout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des disponibilités
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {players.length} joueurs et {journees.length} journées chargés depuis FFTT
        </Typography>

        {/* Statistiques par journée */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistiques par journée
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {journees.map((journee) => (
                <Chip
                  key={`${journee.phase}_${journee.number}`}
                  label={`${journee.name}: ${stats[journee.number]?.available || 0}/${stats[journee.number]?.total || 0}`}
                  color={
                    (stats[journee.number]?.available || 0) >= (stats[journee.number]?.total || 0) * 0.8
                      ? "success"
                      : "warning"
                  }
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Tableau des disponibilités */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Disponibilités des joueurs
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Joueur</TableCell>
                    <TableCell>Équipe</TableCell>
                    <TableCell>Points</TableCell>
                    {journees.map((journee) => (
                      <TableCell key={`${journee.phase}_${journee.number}`} align="center">
                        <Box>
                          <Typography variant="body2">{journee.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {journee.dates.map(date => 
                              date.toLocaleDateString("fr-FR", { 
                                day: "numeric", 
                                month: "short" 
                              })
                            ).join(", ")}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {playerAvailabilities.map((pa) => (
                    <TableRow key={pa.playerId}>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography>
                            {pa.player.firstName} {pa.player.lastName}
                          </Typography>
                          {pa.player.isFemale && (
                            <Chip label="F" size="small" color="secondary" />
                          )}
                          {pa.player.isForeign && (
                            <Chip
                              label="Étranger"
                              size="small"
                              color="warning"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>Équipe {pa.player.teamNumber}</TableCell>
                      <TableCell>{pa.player.points}</TableCell>
                      {journees.map((journee) => (
                        <TableCell key={`${journee.phase}_${journee.number}`} align="center">
                          <FormControlLabel
                            control={
                              <Switch
                                checked={pa.availabilities[journee.number] === true}
                                onChange={(e) =>
                                  handleAvailabilityChange(
                                    pa.playerId,
                                    journee.number,
                                    e.target.checked
                                  )
                                }
                                color={getAvailabilityColor(
                                  pa.availabilities[journee.number]
                                )}
                              />
                            }
                            label=""
                          />
                          {pa.availabilities[journee.number] === false &&
                            pa.reasons[journee.number] && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                {pa.reasons[journee]}
                              </Typography>
                            )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={saveAvailabilities}
                disabled={!isCoach}
              >
                Sauvegarder les disponibilités
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Dialog pour saisir la raison d'indisponibilité */}
        <Dialog
          open={showReasonDialog}
          onClose={() => setShowReasonDialog(false)}
        >
          <DialogTitle>
            Raison d'indisponibilité - {selectedPlayer?.player.firstName}{" "}
            {selectedPlayer?.player.lastName}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Raison de l'indisponibilité"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Ex: Blessure, travail, famille..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowReasonDialog(false)}>Annuler</Button>
            <Button onClick={handleReasonSave} variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
