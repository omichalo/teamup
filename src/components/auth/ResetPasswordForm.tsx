"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { clientAuth } from "@/lib/firebase.client";
import { resetPasswordSchema } from "@/lib/validators";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { PasswordField } from "./fields/PasswordField";

type Props = {
  /** Code d'action issu du lien de réinitialisation par email. */
  oobCode: string | null;
  /** Callback de redirection après succès (ex. router.push("/login")). */
  onSuccess: () => void;
};

/**
 * Formulaire de réinitialisation de mot de passe (workflow Firebase oobCode).
 *
 * Distinct du mode `forgot-password` de l'AuthForm : ici l'utilisateur a déjà
 * cliqué sur le lien e-mail et arrive avec un code d'action. On vérifie d'abord
 * le code via `verifyPasswordResetCode`, puis on confirme via
 * `confirmPasswordReset`.
 */
export function ResetPasswordForm({ oobCode, onSuccess }: Props) {
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!oobCode) {
        if (!cancelled) {
          setErr("Code de réinitialisation manquant.");
          setVerifying(false);
        }
        return;
      }
      try {
        const verifiedEmail = await verifyPasswordResetCode(clientAuth, oobCode);
        if (!cancelled) {
          setEmail(verifiedEmail);
          setVerifying(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(getFirebaseErrorMessage(e));
          setVerifying(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (!oobCode) {
      setErr("Code de réinitialisation manquant.");
      return;
    }

    const parsed = resetPasswordSchema.safeParse({
      password,
      confirm: confirmPassword,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(clientAuth, oobCode, password);
      setInfo("Votre mot de passe a été réinitialisé avec succès.");
      setTimeout(onSuccess, 1500);
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Vérification du lien…
        </Typography>
      </Stack>
    );
  }

  if (err && !email) {
    return (
      <Stack spacing={2}>
        <Alert
          severity="error"
          action={
            <Button
              component={NextLink}
              href="/reset"
              color="inherit"
              size="small"
              variant="outlined"
            >
              Demander un nouveau lien
            </Button>
          }
        >
          {err}
        </Alert>
        <MuiLink component={NextLink} href="/login" underline="hover">
          Retour à la connexion
        </MuiLink>
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {email ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pour : <strong>{email}</strong>
        </Typography>
      ) : null}

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

      <PasswordField
        label="Nouveau mot de passe"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        showLockIcon
      />
      {password ? <PasswordRequirements password={password} /> : null}

      <PasswordField
        label="Confirmer le nouveau mot de passe"
        name="confirm"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmPassword !== "" && password !== confirmPassword}
        helperText={
          confirmPassword !== "" && password !== confirmPassword
            ? "Les mots de passe ne correspondent pas"
            : undefined
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={submitting}
      >
        {submitting ? <CircularProgress size={24} /> : "Réinitialiser le mot de passe"}
      </Button>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <MuiLink component={NextLink} href="/login" underline="hover">
          Retour à la connexion
        </MuiLink>
      </Stack>
    </Box>
  );
}
