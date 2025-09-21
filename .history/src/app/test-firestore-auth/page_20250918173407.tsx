"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { getUser } from "@/services/firebase";

export default function TestFirestoreAuthPage() {
  const { user, firebaseUser, loading } = useAuth();
  const [testResult, setTestResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const testFirestoreAccess = async () => {
    if (!firebaseUser) {
      setError("Aucun utilisateur Firebase connecté");
      return;
    }

    try {
      setError("");
      setTestResult("Test en cours...");

      console.log(
        "Test: Tentative d'accès à Firestore avec UID:",
        firebaseUser.uid
      );
      const userData = await getUser(firebaseUser.uid);

      if (userData) {
        setTestResult(
          `✅ Succès! Utilisateur trouvé: ${userData.email} (${userData.role})`
        );
      } else {
        setTestResult("⚠️ Utilisateur non trouvé dans Firestore");
      }
    } catch (err: any) {
      console.error("Test: Erreur:", err);
      setError(`❌ Erreur: ${err.message || err.code || "Erreur inconnue"}`);
      setTestResult("");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test d'accès Firestore
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">État de l'authentification:</Typography>
        <Typography>Loading: {loading ? "Oui" : "Non"}</Typography>
        <Typography>
          Firebase User: {firebaseUser ? firebaseUser.email : "Non connecté"}
        </Typography>
        <Typography>
          User Data: {user ? `${user.email} (${user.role})` : "Non chargé"}
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={testFirestoreAccess}
        disabled={loading || !firebaseUser}
        sx={{ mb: 2 }}
      >
        Tester l'accès Firestore
      </Button>

      {testResult && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {testResult}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
