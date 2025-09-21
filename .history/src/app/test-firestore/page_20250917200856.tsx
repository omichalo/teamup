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
} from "@mui/material";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TestFirestorePage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Récupération des joueurs depuis Firestore...");
      
      const playersRef = collection(db, "players");
      const q = query(playersRef, orderBy("points", "desc"), limit(10));
      
      const querySnapshot = await getDocs(q);
      const playersData: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        playersData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        });
      });

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
        Test Firestore - Joueurs SQY Ping
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={fetchPlayers}
          disabled={loading}
        >
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
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top 10 des joueurs ({players.length} trouvés)
            </Typography>
            {players.map((player, index) => (
              <Box key={player.id} sx={{ mb: 2, p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                <Typography variant="h6">
                  #{index + 1} {player.firstName} {player.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Points: {player.points} | Classement: {player.ranking}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Genre: {player.isFemale ? "F" : "M"} | 
                  Nationalité: {player.isForeign ? "Étranger" : "Français"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  FFTT ID: {player.ffttId}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && players.length === 0 && !error && (
        <Alert severity="info">
          Aucun joueur trouvé dans Firestore.
        </Alert>
      )}
    </Box>
  );
}
