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
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TestFirestoreConnectionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log("🔍 Test de connexion Firestore...");
      console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

      // Test 1: Vérifier la configuration
      const config = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      };

      // Test 2: Essayer de lire la collection players
      const playersRef = collection(db, "players");
      const q = query(playersRef, limit(5));
      const querySnapshot = await getDocs(q);

      const players = querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));

      setResult({
        config,
        playersCount: querySnapshot.size,
        players: players,
        timestamp: new Date().toISOString()
      });

      console.log("✅ Connexion Firestore réussie:", {
        playersCount: querySnapshot.size,
        players: players
      });

    } catch (error: any) {
      console.error("❌ Erreur connexion Firestore:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test Connexion Firestore
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={testConnection}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Tester la Connexion"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur: {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Résultat du Test
            </Typography>
            
            <Typography variant="body2" component="pre" sx={{ 
              backgroundColor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.875rem'
            }}>
              {JSON.stringify(result, null, 2)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
