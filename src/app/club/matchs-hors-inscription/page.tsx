import { Container } from "@mui/material";
import { AuthGuard } from "@/components/AuthGuard";
import { UnregisteredPlayFollowUpContainer } from "@/components/championship/UnregisteredPlayFollowUpContainer";
import { UNREGISTERED_PLAY_FOLLOW_UP_ROLES } from "@/lib/championship/access";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Suivi championnat");

export default function MatchsHorsInscriptionPage() {
  return (
    <AuthGuard
      allowedRoles={[...UNREGISTERED_PLAY_FOLLOW_UP_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <Container maxWidth="lg">
        <UnregisteredPlayFollowUpContainer />
      </Container>
    </AuthGuard>
  );
}
