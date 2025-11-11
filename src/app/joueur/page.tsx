"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  TextField,
  Stack,
  Chip,
} from "@mui/material";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES, COACH_REQUEST_STATUS } from "@/lib/auth/roles";

export default function PlayerHomePage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequestCoach = async () => {
    if (!user) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/coach/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Impossible d'envoyer la demande");
      }

      setSuccess("Votre demande a bien été enregistrée.");
      setMessage("");
      await refreshUser({ forceRefresh: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = user?.coachRequestStatus === COACH_REQUEST_STATUS.PENDING;
  const isApproved =
    user?.coachRequestStatus === COACH_REQUEST_STATUS.APPROVED ||
    user?.role === USER_ROLES.COACH;

  return (
    <AuthGuard allowedRoles={[USER_ROLES.PLAYER]}>
      <Layout>
        <Box sx={{ p: 5, maxWidth: 720, mx: "auto" }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Bienvenue sur l'espace joueur
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Depuis cette page, vous pouvez suivre l'actualité du club et, si
            vous souhaitez participer à l'organisation, demander des droits
            d'entraîneur.
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Votre statut actuel
                  </Typography>
                  <Chip
                    label={`Rôle : ${user?.role ?? "joueur"}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Demande coach : ${user?.coachRequestStatus}`}
                    color={
                      user?.coachRequestStatus === COACH_REQUEST_STATUS.APPROVED
                        ? "success"
                        : user?.coachRequestStatus === COACH_REQUEST_STATUS.PENDING
                        ? "warning"
                        : "default"
                    }
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>

                {isApproved ? (
                  <Alert severity="success">
                    Votre demande de droits coach a été acceptée. Veuillez vous
                    reconnecter pour accéder aux fonctionnalités avancées.
                  </Alert>
                ) : (
                  <>
                    <Typography variant="subtitle1">
                      Demander les droits d'entraîneur
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Les droits coach permettent de gérer les compositions,
                      disponibilités et l'organisation des rencontres. Un
                      administrateur examinera votre demande.
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <TextField
                      label="Message (optionnel)"
                      placeholder="Expliquez pourquoi vous souhaitez obtenir les droits coach"
                      multiline
                      minRows={3}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      disabled={submitting || isPending}
                    />

                    <Button
                      variant="contained"
                      onClick={handleRequestCoach}
                      disabled={submitting || isPending || isApproved}
                    >
                      {isPending
                        ? "Demande en cours de traitement"
                        : "Demander les droits coach"}
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Que puis-je faire en tant que joueur ?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pour le moment, l'espace joueur est limité. Vous pouvez demander
                des droits supplémentaires via le formulaire ci-dessus pour
                accéder à l'outil de préparation des compositions et suivre les
                disponibilités.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Layout>
    </AuthGuard>
  );
}
