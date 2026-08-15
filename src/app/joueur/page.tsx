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
  Badge as BadgeIcon,
  Description as DescriptionIcon,
  EventAvailable as EventAvailableIcon,
  SportsTennis as SportsTennisIcon,
  TableChart as TableChartIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@/lib/auth/roles";
import { canAccessLicenseValidation } from "@/lib/license-validation/access";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
};

export default function PlayerHomePage() {
  const { user, isAssistantSecretary } = useAuth();

  const quickActions: QuickAction[] = [
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
  ];

  if (isAssistantSecretary) {
    quickActions.push({
      title: "Tableau des adhésions",
      description:
        "Consulter tous les dossiers, filtrer les colonnes et exporter le tableau.",
      href: "/club/adhesions-tableau",
      cta: "Ouvrir le tableau",
      icon: <TableChartIcon color="primary" />,
    });
  }

  if (user && canAccessLicenseValidation(user.role)) {
    quickActions.push({
      title: "Licences & encaissements",
      description:
        "Saisir les numéros de licence FFTT, suivre les validations et les encaissements.",
      href: "/club/validations-licence",
      cta: "Ouvrir l’espace licences",
      icon: <BadgeIcon color="primary" />,
    });
  }

  return (
    <AuthGuard
      allowedRoles={[
        USER_ROLES.PLAYER,
        USER_ROLES.ASSISTANT_SECRETARY,
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
