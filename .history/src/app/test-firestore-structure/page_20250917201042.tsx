"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TestFirestoreStructurePage() {
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCollections = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Vérification des collections Firestore...");

      // Collections connues à vérifier
      const knownCollections = [
        "players",
        "users", 
        "teams",
        "matches",
        "compositions",
        "availabilities",
        "sync_logs",
        "club_settings"
      ];

      const existingCollections: string[] = [];

      for (const collectionName of knownCollections) {
        try {
          const collectionRef = collection(db, collectionName);
          const q = query(collectionRef, limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            existingCollections.push(`${collectionName} (${querySnapshot.size} document(s))`);
            console.log(`✅ Collection ${collectionName} trouvée avec ${querySnapshot.size} document(s)`);
          } else {
            console.log(`⚠️ Collection ${collectionName} vide`);
          }
        } catch (err) {
          console.log(`❌ Erreur collection ${collectionName}:`, err);
        }
      }

      setCollections(existingCollections);
    } catch (error) {
      console.error("❌ Erreur générale:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Diagnostic Firestore - Structure des Collections
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={checkCollections}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Vérifier les Collections"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur: {error}
        </Alert>
      )}

      {collections.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Collections trouvées ({collections.length})
            </Typography>
            {collections.map((collection, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body1">
                  ✅ {collection}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && collections.length === 0 && !error && (
        <Alert severity="warning">
          Aucune collection trouvée. Vérifiez la connexion Firebase.
        </Alert>
      )}
    </Box>
  );
}
