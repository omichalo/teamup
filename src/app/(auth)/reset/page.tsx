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
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Email as EmailIcon,
  CheckCircle,
} from "@mui/icons-material";
import Image from "next/image";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
// SMTP-based reset handled by API route; no direct Firebase call here

export default function ResetPage() {
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
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || "Échec d'envoi de l'email de réinitialisation");
      }
      setMsg("Email de réinitialisation envoyé. Vérifiez votre boîte de réception (et vos spams).");
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
          Mot de passe oublié
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {msg && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {msg}
            </Alert>
          )}
          {err && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {err}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} noValidate>
            <TextField
              fullWidth
              label="Email"
              type="email"
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Envoyer le lien"}
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Exigences du mot de passe :
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
              <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Au moins 12 caractères"
                    primaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Au moins une majuscule"
                    primaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Au moins une minuscule"
                    primaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Au moins un chiffre"
                    primaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Au moins un caractère spécial"
                    primaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link href="/login" underline="hover">
              Retour à la connexion
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
