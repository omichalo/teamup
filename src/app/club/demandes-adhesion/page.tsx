import { AuthGuard } from "@/components/AuthGuard";
import { MembershipRequestsClient } from "@/components/club-registration/MembershipRequestsClient";
import { USER_ROLES } from "@/lib/auth/roles";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Dossiers à valider");

export default function DemandesAdhesionPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.SECRETARY, USER_ROLES.ADMIN]}
      redirectWhenUnauthorized="/joueur"
    >
      <MembershipRequestsClient />
    </AuthGuard>
  );
}
