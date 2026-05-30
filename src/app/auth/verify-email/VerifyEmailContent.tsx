"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircle, Error as ErrorIcon } from "@mui/icons-material";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { clientAuth } from "@/lib/firebase.client";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { AuthCardSurface } from "@/components/auth/AuthCardSurface";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const oobCode = searchParams?.get("oobCode");
      if (!oobCode) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Lien de vérification invalide ou expiré.");
        }
        return;
      }

      try {
        const info = await checkActionCode(clientAuth, oobCode);
        const mode = searchParams?.get("mode");
        if (
          mode === "resetPassword" ||
          (info?.operation && String(info.operation).toLowerCase().includes("password"))
        ) {
          router.replace(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`);
          return;
        }

        await applyActionCode(clientAuth, oobCode);
        if (cancelled) return;
        setStatus("success");
        setMessage("Votre email a été vérifié avec succès.");

        setTimeout(() => {
          router.push("/login?next=/joueur");
        }, 2000);
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus("error");
          setMessage(getFirebaseErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <AuthCardSurface title="Vérification de l’email">
      <Box sx={{ textAlign: "center" }}>
        {status === "loading" ? (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body1">
              Vérification de votre email en cours…
            </Typography>
          </Stack>
        ) : null}

        {status === "success" ? (
          <Stack spacing={2} alignItems="center">
            <CheckCircle sx={{ fontSize: 64, color: "success.main" }} />
            <Alert severity="success">{message}</Alert>
            <Typography variant="body2" color="text.secondary">
              Redirection vers la page de connexion…
            </Typography>
          </Stack>
        ) : null}

        {status === "error" ? (
          <Stack spacing={2} alignItems="center">
            <ErrorIcon sx={{ fontSize: 64, color: "error.main" }} />
            <Alert severity="error">{message}</Alert>
            <Stack spacing={1}>
              <Button
                variant="contained"
                onClick={() => router.push("/resend-verification")}
              >
                Demander un nouveau lien
              </Button>
              <Button variant="text" onClick={() => router.push("/login")}>
                Retour à la connexion
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Box>
    </AuthCardSurface>
  );
}
