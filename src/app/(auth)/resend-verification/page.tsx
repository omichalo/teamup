"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Container,
  InputAdornment,
  Link,
} from "@mui/material";
import {
  Email as EmailIcon,
  CheckCircle,
} from "@mui/icons-material";
import Image from "next/image";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || "Échec d'envoi de l'email de vérification");
      }
      setMsg("Email de vérification envoyé. Vérifiez votre boîte de réception (et vos spams).");
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Image
          src="/sqyping-logo.jpg"
          alt="SQY Ping Logo"
          width={120}
          height={120}
          style={{ marginBottom: 24 }}
        />
        <Typography variant="h4" component="h1" gutterBottom>
          Renvoyer l&apos;email de vérification
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Entrez votre adresse email pour recevoir un nouveau lien de vérification
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {msg && (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setMsg(null);
                    setEmail("");
                  }}
                >
                  Fermer
                </Button>
              }
            >
              {msg}
            </Alert>
          )}

          {err && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {err}
            </Alert>
          )}

          <form onSubmit={onSubmit}>
            <TextField
              fullWidth
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !email}
              sx={{ mb: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Envoi en cours...
                </>
              ) : (
                "Renvoyer l'email de vérification"
              )}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Link href="/login" underline="hover">
              Retour à la connexion
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

