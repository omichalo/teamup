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
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerAvailabilities, setPlayerAvailabilities] = useState<
    PlayerAvailability[]
  >([]);
  const [selectedJournee, setSelectedJournee] = useState(1);
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

    loadData();
  }, [user, router]);

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
        {
          id: "2",
          ffttId: "12346",
          firstName: "Marie",
          lastName: "Martin",
          points: 1100,
          ranking: 200,
          isForeign: false,
          isTransferred: false,
          isFemale: true,
          teamNumber: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          ffttId: "12347",
          firstName: "Pierre",
          lastName: "Durand",
          points: 1000,
          ranking: 250,
          isForeign: false,
          isTransferred: false,
          isFemale: false,
          teamNumber: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setPlayers(mockPlayers);

      // Initialiser les disponibilités
      const initialAvailabilities: PlayerAvailability[] = mockPlayers.map(
        (player) => ({
          playerId: player.id,
          player,
          availabilities: {},
          reasons: {},
        })
      );

      setPlayerAvailabilities(initialAvailabilities);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const stats = getAvailabilityStats();

  return (
    <Layout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des disponibilités
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
                  key={journee}
                  label={`J${journee}: ${stats[journee].available}/${stats[journee].total}`}
                  color={
                    stats[journee].available >= stats[journee].total * 0.8
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
                      <TableCell key={journee} align="center">
                        J{journee}
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
                        <TableCell key={journee} align="center">
                          <FormControlLabel
                            control={
                              <Switch
                                checked={pa.availabilities[journee] === true}
                                onChange={(e) =>
                                  handleAvailabilityChange(
                                    pa.playerId,
                                    journee,
                                    e.target.checked
                                  )
                                }
                                color={getAvailabilityColor(
                                  pa.availabilities[journee]
                                )}
                              />
                            }
                            label=""
                          />
                          {pa.availabilities[journee] === false &&
                            pa.reasons[journee] && (
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
