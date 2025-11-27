"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  CardActions,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { PaletteColor } from "@mui/material";
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  AdminPanelSettings as AdminIcon,
  Groups,
  PlaylistAddCheck as DefaultCompoIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuickLinkColor = "primary" | "secondary" | "success" | "info" | "warning";

interface QuickLink {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: ReactNode;
  color: QuickLinkColor;
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const quickLinks: QuickLink[] = [
    {
      title: "Joueurs",
      description: "Gérer les joueurs, participations et équipes préférées",
      href: "/joueurs",
      cta: "Gérer les joueurs",
      icon: <PersonIcon fontSize="medium" />,
      color: "primary",
    },
    {
      title: "Équipes",
      description: "Consulter les équipes, résultats et classements",
      href: "/equipes",
      cta: "Voir les équipes",
      icon: <Groups fontSize="medium" />,
      color: "secondary",
    },
    {
      title: "Disponibilités",
      description: "Saisir les disponibilités par journée et suivre les réponses",
      href: "/disponibilites",
      cta: "Gérer les disponibilités",
      icon: <CalendarIcon fontSize="medium" />,
      color: "info",
    },
    {
      title: "Compositions",
      description: "Composer les équipes en respectant les règles de brûlage",
      href: "/compositions",
      cta: "Composer les équipes",
      icon: <AssignmentIcon fontSize="medium" />,
      color: "warning",
    },
    {
      title: "Compositions par défaut",
      description: "Définir la base de chaque équipe en début de phase",
      href: "/compositions/defaults",
      cta: "Configurer les compositions",
      icon: <DefaultCompoIcon fontSize="medium" />,
      color: "success",
    },
    ...(isAdmin
      ? [
          {
            title: "Administration",
            description: "Synchroniser les données FFTT et gérer les accès",
            href: "/admin",
            cta: "Ouvrir l'administration",
            icon: <AdminIcon fontSize="medium" />,
            color: "secondary",
          } as QuickLink,
        ]
      : []),
  ];

  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
    >
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              borderRadius: 3,
              mb: 5,
              p: { xs: 3, sm: 4 },
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #1d2b64 0%, #1e4875 100%)"
                  : "linear-gradient(135deg, #22418f 0%, #4979f2 100%)",
              color: "common.white",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 18px 32px rgba(29, 43, 100, 0.55)"
                  : "0 20px 40px rgba(73, 121, 242, 0.35)",
            }}
          >
            <Stack spacing={3}>
              <Chip
                label="Bienvenue"
                sx={{
                  width: "fit-content",
                  backgroundColor: alpha("#ffffff", 0.18),
                  color: "common.white",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                SQY Ping TeamUp
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  maxWidth: 640,
                  opacity: 0.92,
                  lineHeight: 1.6,
                }}
              >
                Pilotez la vie sportive du club : suivez les joueurs, organisez les
                compositions et synchronisez les données FFTT en quelques clics.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  "& button": { fontWeight: 600 },
                  mt: 1,
                }}
              >
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => router.push("/compositions")}
                >
                  Composer une équipe
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push("/joueurs")}
                  sx={{
                    borderColor: alpha("#ffffff", 0.5),
                    color: "common.white",
                    "&:hover": {
                      borderColor: "common.white",
                      backgroundColor: alpha("#ffffff", 0.12),
                    },
                  }}
                >
                  Consulter les joueurs
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push("/compositions/defaults")}
                  sx={{
                    borderColor: alpha("#ffffff", 0.5),
                    color: "common.white",
                    "&:hover": {
                      borderColor: "common.white",
                      backgroundColor: alpha("#ffffff", 0.12),
                    },
                  }}
                >
                  Préparer les compos par défaut
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {quickLinks.map((link) => (
              <Grid item xs={12} sm={6} lg={3} key={link.title}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: 6,
                      borderColor: (theme) =>
                        alpha(
                          (theme.palette[link.color] as PaletteColor).main,
                          0.5
                        ),
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={2.5}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: (theme) =>
                            alpha(
                              (theme.palette[link.color] as PaletteColor).main,
                              0.15
                            ),
                          color: (theme) =>
                            (theme.palette[link.color] as PaletteColor).main,
                        }}
                      >
                        {link.icon}
                      </Box>
                      <Stack spacing={0.5}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {link.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {link.description}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color={link.color}
                      component={Link}
                      href={link.href}
                    >
                      {link.cta}
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
