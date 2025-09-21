"use client";

import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";
import { useFirestorePlayers } from "@/hooks/useFirestorePlayers";

export default function TestHookPage() {
  const { players, total, loading, error } = useFirestorePlayers(10);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des joueurs...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Erreur: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test Hook useFirestorePlayers
      </Typography>

      <Typography variant="h6" gutterBottom>
        {total} joueurs trouvés
      </Typography>

      {players.length === 0 ? (
        <Alert severity="info">Aucun joueur trouvé.</Alert>
      ) : (
        <Paper elevation={2} sx={{ mt: 3, maxHeight: 600, overflow: "auto" }}>
          <List>
            {players.map((player) => (
              <ListItem key={player.id} divider>
                <ListItemText
                  primary={`${player.firstName} ${player.lastName} (Licence: ${player.ffttId})`}
                  secondary={`Points: ${player.points}, Classement: ${
                    player.ranking
                  }, Sexe: ${player.isFemale ? "F" : "M"}, Nationalité: ${
                    player.isForeign ? "Étranger" : "Français"
                  }`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
