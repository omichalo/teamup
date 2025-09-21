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
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Player {
  id: string;
  ffttId: string;
  firstName: string;
  lastName: string;
  points: number;
  ranking: number;
  isForeign: boolean;
  isTransferred: boolean;
  isFemale: boolean;
  teamNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function JoueursFirestorePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Récupération des joueurs depuis Firestore...");

      // Récupérer les joueurs depuis Firestore
      const playersRef = collection(db, "players");
      const q = query(
        playersRef,
        orderBy("points", "desc"),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const playersData: Player[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        playersData.push({
          id: doc.id,
          ffttId: data.ffttId,
          firstName: data.firstName,
          lastName: data.lastName,
          points: data.points,
          ranking: data.ranking,
          isForeign: data.isForeign,
          isTransferred: data.isTransferred,
          isFemale: data.isFemale,
          teamNumber: data.teamNumber,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      console.log(`✅ ${playersData.length} joueurs récupérés depuis Firestore`);
      setPlayers(playersData);
      setTotalCount(playersData.length);
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

  const filteredPlayers = players.filter(
    (player) =>
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.ffttId.includes(searchTerm)
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des joueurs depuis Firestore...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Erreur lors du chargement des joueurs : {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Joueurs SQY Ping - Firestore
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Rechercher un joueur..."
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
            startIcon={<Refresh />}
            onClick={fetchPlayers}
            disabled={loading}
            fullWidth
          >
            Actualiser
          </Button>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <SportsTennis sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">
              {totalCount} joueurs trouvés
            </Typography>
          </Box>

          {players.length === 0 ? (
            <Alert severity="info">
              Aucun joueur trouvé dans Firestore. Vérifiez que la synchronisation a bien fonctionné.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Licence FFTT</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell align="right">Classement</TableCell>
                    <TableCell align="center">Sexe</TableCell>
                    <TableCell align="center">Nationalité</TableCell>
                    <TableCell align="center">Équipe</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Person sx={{ mr: 1, fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {player.firstName} {player.lastName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {player.ffttId}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {player.points}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {player.ranking}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={player.isFemale ? "F" : "M"}
                          color={player.isFemale ? "secondary" : "primary"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={player.isForeign ? "Étranger" : "Français"}
                          color={player.isForeign ? "warning" : "success"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {player.teamNumber || "N/A"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
