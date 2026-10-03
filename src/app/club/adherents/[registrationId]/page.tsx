import { AuthGuard } from "@/components/AuthGuard";
import { MemberProfileClient } from "@/components/member-profile/MemberProfileClient";
import { ALL_USER_ROLES } from "@/lib/auth/roles";
import { Container } from "@mui/material";

type PageProps = {
  params: Promise<{ registrationId: string }>;
};

/**
 * Fiche adhérent (vue 360°) — propriétaire du dossier ou rôles spreadsheet.
 * L'API impose canViewClubRegistration.
 */
export default async function MemberProfilePage({ params }: PageProps) {
  const { registrationId } = await params;

  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3.5 } }}>
        <MemberProfileClient registrationId={registrationId} />
      </Container>
    </AuthGuard>
  );
}
