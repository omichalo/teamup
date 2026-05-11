"use client";

import { FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
} from "@mui/material";
import NextLink from "next/link";
import { emailSchema } from "@/lib/validators";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { EmailField } from "./fields/EmailField";

/**
 * Formulaire « Renvoyer l'email de vérification ».
 *
 * Distinct du mode `forgot-password` de l'AuthForm (endpoint et message
 * différents). Utilise les mêmes briques (EmailField, schemas Zod).
 */
export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Échec d'envoi de l'email de vérification");
      }
      setInfo(
        "Email de vérification envoyé. Vérifiez votre boîte de réception (et vos spams)."
      );
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {info ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          {info}
        </Alert>
      ) : null}
      {err ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {err}
        </Alert>
      ) : null}

      <EmailField
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading || !email}
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          "Renvoyer l’email de vérification"
        )}
      </Button>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <MuiLink component={NextLink} href="/login" underline="hover">
          Retour à la connexion
        </MuiLink>
      </Stack>
    </Box>
  );
}
