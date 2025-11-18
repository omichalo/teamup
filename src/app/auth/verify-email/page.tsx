"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container,
} from "@mui/material";
import { CheckCircle, Error as ErrorIcon } from "@mui/icons-material";
import Image from "next/image";
import { clientAuth } from "@/lib/firebase.client";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams?.get("oobCode");
      // Certains fournisseurs d'email peuvent ne pas préserver le paramètre "mode"
      // On se base uniquement sur la présence du oobCode.
      if (!oobCode) {
        setStatus("error");
        setMessage("Lien de vérification invalide ou expiré.");
        return;
      }

      try {
        // Vérifier le code pour connaître l'opération
        const info = await checkActionCode(clientAuth, oobCode);
        // Si ce code correspond à une réinitialisation, rediriger vers la bonne page
        const mode = searchParams?.get("mode");
        if (mode === "resetPassword" || (info?.operation && String(info.operation).toLowerCase().includes("password"))) {
          // Rediriger vers la page reset-password avec le même oobCode
          router.replace(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`);
          return;
        }

        // Appliquer le code de vérification
        await applyActionCode(clientAuth, oobCode);
        setStatus("success");
        setMessage("Votre email a été vérifié avec succès !");
        
        // Rediriger vers la page joueur après 2 secondes (via login si nécessaire)
        setTimeout(() => {
          router.push("/login?next=/joueur");
        }, 2000);
      } catch (error: unknown) {
        console.error("[Verify Email] Error:", error);
        setStatus("error");
        setMessage(getFirebaseErrorMessage(error));
      }
    };

    verifyEmail();
  }, [searchParams, router]);

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
          Vérification de l'email
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          {status === "loading" && (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1">
                Vérification de votre email en cours...
              </Typography>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Alert severity="success" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Redirection vers la page de connexion...
              </Typography>
            </>
          )}

          {status === "error" && (
            <>
              <ErrorIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
              <Alert severity="error" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Button
                variant="contained"
                onClick={() => router.push("/resend-verification")}
                sx={{ mt: 2 }}
              >
                Demander un nouveau lien
              </Button>
              <Box sx={{ mt: 2 }}>
                <Button variant="text" onClick={() => router.push("/login")}>
                  Retour à la connexion
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

