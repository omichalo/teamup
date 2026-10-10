import type { Metadata } from "next";
import Link from "next/link";
import { Box, Container, Stack, Typography } from "@mui/material";
import { ManageAnalyticsConsentButton } from "@/components/analytics/ManageAnalyticsConsentButton";

export const metadata: Metadata = {
  title: "Confidentialité",
  description:
    "Informations sur la mesure d’audience et le traitement des données de navigation sur TeamUp.",
};

export default function ConfidentialitePage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Confidentialité et mesure d’audience
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Cette page décrit l’usage de la mesure d’audience sur l’application TeamUp
          (SQY Ping). Elle ne remplace pas une politique de confidentialité complète
          du club pour les données d’adhésion.
        </Typography>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Finalité
          </Typography>
          <Typography variant="body1">
            Mesurer l’audience et l’usage des pages (pages vues, parcours de navigation)
            afin d’améliorer le service. Aucune publicité ni revente de données à cette
            fin.
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Outil
          </Typography>
          <Typography variant="body1">
            Google Analytics for Firebase (Google Analytics 4), fourni par Google
            Ireland Limited / Google LLC. Les données peuvent être traitées hors Union
            européenne selon les conditions de Google.
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Base légale
          </Typography>
          <Typography variant="body1">
            Consentement préalable. Le SDK de mesure n’est chargé qu’après un clic sur
            « Accepter ». Un refus empêche toute initialisation Analytics.
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Conservation du choix
          </Typography>
          <Typography variant="body1">
            Votre choix (accepter ou refuser) est enregistré dans le navigateur
            (localStorage, clé{" "}
            <Typography component="span" fontFamily="monospace" variant="body2">
              teamup_analytics_consent
            </Typography>
            ). Vous pouvez le modifier à tout moment :
          </Typography>
          <Box sx={{ mt: 2 }}>
            <ManageAnalyticsConsentButton />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          <Link href="/">Retour à l’accueil</Link>
        </Typography>
      </Stack>
    </Container>
  );
}
