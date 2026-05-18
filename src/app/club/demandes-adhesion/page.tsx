import { AuthGuard } from "@/components/AuthGuard";
import { MembershipRequestsClient } from "@/components/club-registration/MembershipRequestsClient";
import { USER_ROLES } from "@/lib/auth/roles";

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
