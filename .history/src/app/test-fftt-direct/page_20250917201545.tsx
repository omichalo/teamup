"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
} from "@mui/material";

interface FFTTPlayer {
  licence: string;
  nom: string;
  prenom: string;
  points: number;
  classement: number;
  natio: string; // 'F' for French, 'E' for foreign
  sexe: string; // 'M' for male, 'F' for female
}

export default function TestFFTTDirectPage() {
  const [players, setPlayers] = useState<FFTTPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Récupération des joueurs depuis l'API FFTT...");
      
      const response = await fetch("/api/fftt/players?clubCode=08781477");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const playersData = await response.json();
      console.log(`✅ ${playersData.length} joueurs récupérés:`, playersData);
      setPlayers(playersData);
    } catch (error) {
      console.error("❌ Erreur:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test API FFTT Directe - Joueurs SQY Ping
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={fetchPlayers} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Actualiser"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur: {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {players.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistiques
                </Typography>
                <Typography variant="body1">
                  <strong>Total joueurs :</strong> {players.length}
                </Typography>
                <Typography variant="body1">
                  <strong>Joueurs masculins :</strong>{" "}
                  {players.filter((p) => p.sexe === "M").length}
                </Typography>
                <Typography variant="body1">
                  <strong>Joueurs féminins :</strong>{" "}
                  {players.filter((p) => p.sexe === "F").length}
                </Typography>
                <Typography variant="body1">
                  <strong>Joueurs étrangers :</strong>{" "}
                  {players.filter((p) => p.natio === "E").length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Liste des Joueurs (Top 50)
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Prénom</TableCell>
                        <TableCell>Points</TableCell>
                        <TableCell>Classement</TableCell>
                        <TableCell>Genre</TableCell>
                        <TableCell>Nationalité</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {players.slice(0, 50).map((player) => (
                        <TableRow key={player.licence}>
                          <TableCell>{player.nom}</TableCell>
                          <TableCell>{player.prenom}</TableCell>
                          <TableCell>{player.points}</TableCell>
                          <TableCell>{player.classement}</TableCell>
                          <TableCell>
                            <Chip
                              label={player.sexe === "F" ? "F" : "M"}
                              color={player.sexe === "F" ? "secondary" : "primary"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={player.natio === "E" ? "Étranger" : "Français"}
                              color={player.natio === "E" ? "warning" : "success"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!loading && players.length === 0 && !error && (
        <Alert severity="info">Aucun joueur trouvé via l'API FFTT.</Alert>
      )}
    </Box>
  );
}
