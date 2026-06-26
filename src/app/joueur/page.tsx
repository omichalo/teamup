"use client";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  CardActions,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Description as DescriptionIcon,
  EventAvailable as EventAvailableIcon,
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";

export default function PlayerHomePage() {
  const quickActions = [
    {
      title: "Nouvelle adhésion",
      description:
        "Créer un nouveau dossier d'adhésion pour vous ou un membre de votre foyer.",
      href: "/club/inscription",
      cta: "Démarrer une adhésion",
      icon: <DescriptionIcon color="primary" />,
    },
    {
      title: "Mes dossiers",
      description:
        "Suivre l'avancement de vos dossiers et vérifier les informations transmises.",
      href: "/club/mes-inscriptions",
      cta: "Voir mes dossiers",
      icon: <EventAvailableIcon color="primary" />,
    },
  ] as const;

  return (
    <AuthGuard
      allowedRoles={[
        USER_ROLES.PLAYER,
        USER_ROLES.SECRETARY,
        USER_ROLES.COACH,
        USER_ROLES.ADMIN,
      ]}
    >
      <Box sx={{ p: { xs: 3, sm: 4 }, maxWidth: 980, mx: "auto" }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <SportsTennisIcon color="primary" />
              <Typography variant="h4" component="h1">
                Bienvenue sur TeamUp
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              Cet espace est votre point d&apos;entrée pour la vie du club. Vous pouvez
              lancer une inscription, suivre vos dossiers et retrouver rapidement vos
              démarches administratives.
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          {quickActions.map((action) => (
            <Grid item xs={12} md={6} key={action.title}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    {action.icon}
                    <Typography variant="h6">{action.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button component={Link} href={action.href} variant="contained">
                    {action.cta}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </AuthGuard>
  );
}
