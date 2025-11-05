"use client";

import React from "react";
import { Layout } from "@/components/Layout";
import { RedirectToAuth } from "@/components/RedirectToAuth";
import { useAuth } from "@/hooks/useAuth";
import { Box, Typography, Card, CardContent } from "@mui/material";
import {
  // SportsTennis as PingPongIcon,
  // Group,
  // Event,
  Sports,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Si pas d&apos;utilisateur connecté, rediriger vers /auth
  if (!loading && !user) {
    return <RedirectToAuth />;
  }

  // Pendant le chargement, afficher un loader
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          SQY Ping TeamUp
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Bienvenue sur l&apos;application de gestion des équipes SQY Ping
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 3,
          }}
        >
          <Box>
            <Card
              sx={{ height: "100%", cursor: "pointer" }}
              onClick={() => router.push("/joueurs")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Joueurs</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Gérer les joueurs, participations et équipes préférées
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Gérer les joueurs
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card
              sx={{ height: "100%", cursor: "pointer" }}
              onClick={() => router.push("/disponibilites")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Disponibilités</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Saisir les disponibilités par journée
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Gérer les disponibilités
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card
              sx={{ height: "100%", cursor: "pointer" }}
              onClick={() => router.push("/compositions")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Compositions</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Composer les équipes avec règles de brûlage
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Composer les équipes
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card
              sx={{ height: "100%", cursor: "pointer" }}
              onClick={() => router.push("/equipes")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Sports sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Équipes</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Consulter les équipes et matchs
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Voir les équipes
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card
              sx={{ height: "100%", cursor: "pointer" }}
              onClick={() => router.push("/admin")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <AdminIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Administration</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Synchronisation des données FFTT
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Administration
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
