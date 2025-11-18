"use client";

import { FormEvent, useState } from "react";
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
  IconButton,
  Link,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
} from "@mui/icons-material";
import Image from "next/image";
import { loginSchema } from "@/lib/validators";
import { clientAuth } from "@/lib/firebase.client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";

export default function LoginPage() {
  const params = useSearchParams();
  const next = params?.get("next") || "/";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(
        clientAuth,
        email,
        password
      );
      if (!cred.user.emailVerified) {
        try {
          console.log("[Login] Sending email verification to:", email);
          await fetch("/api/auth/send-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          console.log("[Login] Email verification sent successfully");
          setErr(
            "Email non vérifié. Un nouveau lien de vérification vient d'être envoyé à votre adresse email. Veuillez vérifier votre boîte de réception (et vos spams)."
          );
        } catch (emailError) {
          console.error(
            "[Login] Error sending email verification:",
            emailError
          );
          setErr(
            "Email non vérifié. Impossible d'envoyer l'email de vérification. Veuillez réessayer plus tard ou contacter l'administrateur."
          );
        }
        setLoading(false);
        return;
      }
      const idToken = await cred.user.getIdToken(true);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Échec création session");
      }

      // Utiliser window.location.href pour forcer un rechargement complet
      // Cela garantit que le cookie est bien envoyé au serveur et que le middleware le voit
      window.location.href = next;
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
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
          Connexion
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {err && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {err}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} noValidate>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              required
              margin="normal"
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

            <TextField
              fullWidth
              label="Mot de passe"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              margin="normal"
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
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
              {loading ? <CircularProgress size={24} /> : "Se connecter"}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link href="/signup" underline="hover">
              Pas de compte ? Créer un compte
            </Link>
          </Box>
          <Box sx={{ mt: 1, textAlign: "center" }}>
            <Link href="/reset" underline="hover">
              Mot de passe oublié ?
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
