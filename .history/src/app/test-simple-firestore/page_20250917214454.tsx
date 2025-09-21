"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { collection, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TestSimpleFirestorePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log("🔍 Test simple de connexion Firestore...");

      // Test simple : récupérer quelques documents de la collection 'players'
      const playersRef = collection(db, "players");
      const q = limit(playersRef, 5);

      const querySnapshot = await getDocs(q);
      const players: any[] = [];

      querySnapshot.forEach((doc) => {
        players.push({
          id: doc.id,
          data: doc.data(),
        });
      });

      setResult({
        status: "success",
        message: `Connexion Firestore réussie ! ${players.length} joueurs trouvés.`,
        playersCount: players.length,
        players: players,
        timestamp: new Date().toISOString(),
      });

      console.log("✅ Connexion Firestore réussie:", {
        playersCount: players.length,
        players: players,
      });
    } catch (error: any) {
      console.error("❌ Erreur connexion Firestore:", error);
      setError(error.message || "Échec de la connexion à Firestore.");
      setResult({
        status: "error",
        message: "Échec de la connexion à Firestore.",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run the test on component mount
    testConnection();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test Simple Firestore
      </Typography>

      <Button
        variant="contained"
        onClick={testConnection}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : "Tester la Connexion"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && result.status === "success" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {result.message}
        </Alert>
      )}

      {result && result.status === "error" && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {result.message} - Détails: {result.details}
        </Alert>
      )}

      {result && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Résultat du Test ({result.timestamp})
            </Typography>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                backgroundColor: "grey.100",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
