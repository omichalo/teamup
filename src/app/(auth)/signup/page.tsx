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
import { signupSchema } from "@/lib/validators";
import { clientAuth } from "@/lib/firebase.client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { PasswordRequirements } from "@/components/PasswordRequirements";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");

    const parsed = signupSchema.safeParse({ email, password, confirm: confirmPassword });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      setLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(
        clientAuth,
        email,
        password
      );
      try {
        console.log("[Signup] Sending email verification to:", email);
        // Envoi via SMTP: appelle l'API pour générer le lien et envoyer le mail
        await fetch("/api/auth/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        console.log("[Signup] Email verification sent successfully");
        setMsg(
          "Compte créé ! Un email de vérification t'a été envoyé. Valide-le avant de te connecter. Vérifie aussi tes spams si tu ne le vois pas."
        );
      } catch (emailError) {
        console.error("[Signup] Error sending email verification:", emailError);
        setMsg(
          "Compte créé ! Cependant, l'envoi de l'email de vérification a échoué. Tu peux te connecter et demander un nouvel email de vérification."
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur à l'inscription");
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
          Créer un compte
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {msg && (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                {msg}
              </Alert>
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button href="/login" variant="contained">
                  Aller à la connexion
                </Button>
              </Box>
            </>
          )}
          {err && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {err}
            </Alert>
          )}

          {!msg && (
            <>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {password && <PasswordRequirements password={password} />}

                <TextField
                  fullWidth
                  label="Confirmer le mot de passe"
                  name="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  margin="normal"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPassword !== "" && password !== confirmPassword}
                  helperText={
                    confirmPassword !== "" && password !== confirmPassword
                      ? "Les mots de passe ne correspondent pas"
                      : ""
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
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
                  {loading ? <CircularProgress size={24} /> : "S'inscrire"}
                </Button>
              </Box>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Link href="/login" underline="hover">
                  Déjà inscrit ? Se connecter
                </Link>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
