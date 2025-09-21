"use client";

import React, { useState } from "react";
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

export default function TestDirectFirestorePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDirectConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log("🔍 Test direct de connexion Firestore...");
      console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

      // Test direct : récupérer quelques documents de la collection 'players'
      const playersRef = collection(db, "players");
      const q = limit(playersRef, 5);

      console.log("🔄 Exécution de la requête...");
      const querySnapshot = await getDocs(q);
      console.log("✅ Requête terminée,", querySnapshot.size, "documents");

      const players = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }));

      setResult({
        status: "success",
        message: `Connexion Firestore réussie - ${querySnapshot.size} joueurs trouvés`,
        playersCount: querySnapshot.size,
        players: players.slice(0, 3), // Afficher seulement les 3 premiers
        timestamp: new Date().toISOString(),
      });

      console.log("✅ Test direct terminé:", {
        playersCount: querySnapshot.size,
        players: players.slice(0, 3),
      });
    } catch (error: any) {
      console.error("❌ Erreur test direct:", error);
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test Direct Firestore
      </Typography>

      <Button
        variant="contained"
        onClick={testDirectConnection}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          "Tester la Connexion Directe"
        )}
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
