"use client";

import { FormEvent, useState, useEffect } from "react";
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
  Lock as LockIcon,
} from "@mui/icons-material";
import Image from "next/image";
import { resetPasswordSchema } from "@/lib/validators";
import { clientAuth } from "@/lib/firebase.client";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordRequirements } from "@/components/PasswordRequirements";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams?.get("oobCode");

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setErr("Code de réinitialisation manquant.");
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        const email = await verifyPasswordResetCode(clientAuth, oobCode);
        setEmail(email);
        setVerifying(false);
        setLoading(false);
      } catch (error: any) {
        console.error("Error verifying password reset code:", error);
        if (error.code === "auth/invalid-action-code") {
          setErr(
            "Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien."
          );
        } else if (error.code === "auth/expired-action-code") {
          setErr(
            "Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien."
          );
        } else {
          setErr(
            error.message ||
              "Une erreur est survenue lors de la vérification du lien."
          );
        }
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    if (!oobCode) {
      setErr("Code de réinitialisation manquant.");
      setLoading(false);
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password, confirm: confirmPassword });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      setLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(clientAuth, oobCode, password);
      setMsg("Votre mot de passe a été réinitialisé avec succès !");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.code === "auth/invalid-action-code") {
        setErr(
          "Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien."
        );
      } else if (error.code === "auth/expired-action-code") {
        setErr(
          "Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien."
        );
      } else {
        setErr(
          error.message ||
            "Une erreur est survenue lors de la réinitialisation du mot de passe."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (verifying || loading) {
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
        </Box>
        <Card>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {verifying ? "Vérification du lien..." : "Réinitialisation en cours..."}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
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
          Réinitialiser le mot de passe
        </Typography>
        {email && (
          <Typography variant="body2" color="text.secondary">
            Pour : {email}
          </Typography>
        )}
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
              {err.includes("expiré") && (
                <Box sx={{ mt: 2 }}>
                  <Link href="/reset" underline="hover">
                    <Button variant="outlined" size="small">
                      Demander un nouveau lien
                    </Button>
                  </Link>
                </Box>
              )}
            </Alert>
          )}

          {!err && (
            <Box component="form" onSubmit={onSubmit} noValidate>
              <TextField
                fullWidth
                label="Nouveau mot de passe"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                margin="normal"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
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
                label="Confirmer le nouveau mot de passe"
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
                {loading ? <CircularProgress size={24} /> : "Réinitialiser le mot de passe"}
              </Button>
            </Box>
          )}

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

