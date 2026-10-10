import { AuthGuard } from "@/components/AuthGuard";
import { MyMemberProfileEntryClient } from "@/components/member-profile/MyMemberProfileEntryClient";
import { ALL_USER_ROLES } from "@/lib/auth/roles";
import { Container } from "@mui/material";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Ma fiche");

/**
 * Accès direct joueur/famille à la fiche adhérent.
 * 1 dossier → redirection ; plusieurs → sélecteur ; 0 → empty state.
 */
export default function MyMemberProfilePage() {
  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]}>
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 3.5 } }}>
        <MyMemberProfileEntryClient />
      </Container>
    </AuthGuard>
  );
}
