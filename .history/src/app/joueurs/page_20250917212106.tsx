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
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search, Refresh, Person, SportsTennis } from "@mui/icons-material";

interface FFTTPlayer {
  licence: string;
  nom: string;
  prenom: string;
  points: number;
  classement: number;
  natio: string; // 'F' for French, 'E' for foreign
  sexe: string; // 'M' for male, 'F' for female
}

export default function JoueursPage() {
  const [players, setPlayers] = useState<FFTTPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
      console.log(`✅ ${playersData.length} joueurs récupérés`);
      
      setPlayers(playersData);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des joueurs:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(player =>
    `${player.prenom} ${player.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.licence.includes(searchTerm)
  );

  const getGenderChip = (sexe: string) => (
    <Chip
      label={sexe === "F" ? "Féminin" : "Masculin"}
      color={sexe === "F" ? "secondary" : "primary"}
      size="small"
    />
  );

  const getNationalityChip = (natio: string) => (
    <Chip
      label={natio === "F" ? "Français" : "Étranger"}
      color={natio === "F" ? "success" : "warning"}
      size="small"
    />
  );

  const getRankingColor = (points: number) => {
    if (points >= 2000) return "success";
    if (points >= 1500) return "info";
    if (points >= 1000) return "warning";
    return "default";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <SportsTennis sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Joueurs SQY Ping
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Rechercher un joueur par nom ou licence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            onClick={fetchPlayers}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
            fullWidth
          >
            {loading ? "Chargement..." : "Actualiser"}
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur lors du chargement des joueurs : {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Chargement des joueurs...
          </Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">
              {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? "s" : ""} trouvé{filteredPlayers.length > 1 ? "s" : ""}
            </Typography>
            {searchTerm && (
              <Chip
                label={`Recherche: "${searchTerm}"`}
                onDelete={() => setSearchTerm("")}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Licence</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Classement</TableCell>
                  <TableCell>Sexe</TableCell>
                  <TableCell>Nationalité</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.licence} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Person sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight="medium">
                          {player.prenom} {player.nom}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {player.licence}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={player.points}
                        color={getRankingColor(player.points)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.classement}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getGenderChip(player.sexe)}
                    </TableCell>
                    <TableCell>
                      {getNationalityChip(player.natio)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredPlayers.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Aucun joueur trouvé
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Essayez de modifier votre recherche
              </Typography>
            </Box>
          )}
        </>
      )}

      <Box sx={{ mt: 4, p: 2, backgroundColor: "grey.50", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note :</strong> Cette page affiche les données en temps réel depuis l'API FFTT. 
          Les données sont mises à jour automatiquement lors de chaque actualisation.
        </Typography>
      </Box>
    </Box>
  );
}
