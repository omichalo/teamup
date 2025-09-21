"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
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
import { useFirestorePlayers } from "@/hooks/useFirestorePlayers";

export default function TestPlayersPage() {
  const { players, total, loading, error } = useFirestorePlayers(100);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Erreur lors du chargement des joueurs : {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Test des Joueurs Firestore - SQY Ping
        </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistiques
              </Typography>
              <Typography variant="body1">
                <strong>Total joueurs :</strong> {total}
              </Typography>
              <Typography variant="body1">
                <strong>Joueurs masculins :</strong>{" "}
                {players.filter((p) => !p.isFemale).length}
              </Typography>
              <Typography variant="body1">
                <strong>Joueurs féminins :</strong>{" "}
                {players.filter((p) => p.isFemale).length}
              </Typography>
              <Typography variant="body1">
                <strong>Joueurs étrangers :</strong>{" "}
                {players.filter((p) => p.isForeign).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Liste des Joueurs (Top 20)
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
                    {players.slice(0, 20).map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>{player.lastName}</TableCell>
                        <TableCell>{player.firstName}</TableCell>
                        <TableCell>
                          <Chip
                            label={player.points}
                            color={player.points > 1000 ? "primary" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{player.ranking}</TableCell>
                        <TableCell>
                          <Chip
                            label={player.isFemale ? "F" : "M"}
                            color={player.isFemale ? "secondary" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={player.isForeign ? "Étranger" : "Français"}
                            color={player.isForeign ? "warning" : "success"}
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
    </Box>
  );
}
