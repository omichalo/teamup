"use client";

import { Box, CircularProgress, Container } from "@mui/material";
import { ClubRegistrationWizard } from "@/components/club-registration/ClubRegistrationWizard";
import { useAuth } from "@/hooks/useAuth";
import { isClubRegistrationManager } from "@/lib/club-registration/registration-access";

/**
 * Page d'inscription au club (parcours hybride).
 *
 * Le formulaire est utilisable en mode anonyme (sauvegarde locale du brouillon)
 * ainsi qu'en mode connecté. La connexion ne devient obligatoire qu'au moment
 * de l'envoi du dossier au club (livré en PR 2).
 *
 * Les actions liées au compte (avatar, déconnexion, connexion) sont gérées
 * globalement par le header dans `Layout.tsx`.
 */
export default function ClubInscriptionPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <ClubRegistrationWizard
        accountEmail={user?.email ?? null}
        isRegistrationManager={
          user?.role != null && isClubRegistrationManager(user.role)
        }
      />
    </Container>
  );
}
