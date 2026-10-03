"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import {
  findMesInscriptionSectionLabel,
  MES_INSCRIPTION_STATUS_COLOR,
  MES_INSCRIPTION_STATUS_LABEL,
  type MesInscriptionSummary,
  type MesInscriptionsApiResponse,
} from "@/components/club-registration/mes-inscriptions-shared";
import { resolveMesInscriptionStatusPresentation } from "@/lib/club-registration/mes-inscription-supplement-display";
import { buildMemberProfileHref } from "@/lib/member-profile/urls";

/**
 * Entrée « Ma fiche » :
 * - 1 dossier → redirection vers la fiche
 * - plusieurs → choix explicite (saison / adhérent)
 * - 0 → état vide
 */
export function MyMemberProfileEntryClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<MesInscriptionSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/club/registrations", {
          credentials: "include",
        });
        const json = (await res.json()) as MesInscriptionsApiResponse;
        if (cancelled) return;
        if (!res.ok || "error" in json) {
          setError(
            "error" in json ? json.error : "Impossible de charger vos fiches."
          );
          setRegistrations([]);
          return;
        }
        const list = json.registrations;
        if (list.length === 1) {
          router.replace(buildMemberProfileHref(list[0]!.id));
          return;
        }
        setRegistrations(list);
      } catch {
        if (!cancelled) {
          setError("Connexion impossible avec le serveur.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (registrations.length === 0) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <Typography variant="h5" component="h1" color="primary.main">
          Ma fiche
        </Typography>
        <Alert severity="info" variant="outlined">
          Vous n&apos;avez encore aucun dossier d&apos;adhésion. Créez une inscription
          pour accéder à votre fiche (créneaux, présences, finances).
        </Alert>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            component={Link}
            href="/club/inscription"
            variant="contained"
            color="secondary"
            startIcon={<HowToRegIcon />}
          >
            Nouvelle adhésion
          </Button>
          <Button component={Link} href="/club/mes-inscriptions" variant="outlined">
            Mes dossiers
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" component="h1" color="primary.main">
          Choisir une fiche
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Plusieurs adhésions sont liées à votre compte. Ouvrez la fiche de la
          personne / saison concernée.
        </Typography>
      </Box>

      <Stack spacing={1.25}>
        {registrations.map((registration) => {
          const status = resolveMesInscriptionStatusPresentation(
            registration,
            MES_INSCRIPTION_STATUS_LABEL,
            MES_INSCRIPTION_STATUS_COLOR
          );
          const name =
            formatPersonDisplayName(registration.firstName, registration.lastName) ||
            "Adhérent";
          const section = registration.mainSectionId
            ? findMesInscriptionSectionLabel(registration.mainSectionId)
            : null;

          return (
            <Box
              key={registration.id}
              component={Link}
              href={buildMemberProfileHref(registration.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.75,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 120ms ease, box-shadow 120ms ease",
                "&:hover": {
                  borderColor: "secondary.main",
                  boxShadow: (theme) =>
                    `0 0 0 3px ${theme.palette.secondary.main}22`,
                },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  flexShrink: 0,
                }}
              >
                <PersonSearchIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ wordBreak: "break-word" }}>
                  {name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[section, `Réf. ${registration.id}`].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Chip size="small" label={status.label} color={status.color} />
              <ArrowForwardIcon color="action" fontSize="small" />
            </Box>
          );
        })}
      </Stack>

      <Button
        component={Link}
        href="/club/mes-inscriptions"
        size="small"
        sx={{ alignSelf: "flex-start" }}
      >
        Voir Mes dossiers (paiement & justificatifs)
      </Button>
    </Stack>
  );
}
