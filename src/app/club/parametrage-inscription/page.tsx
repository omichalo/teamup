import { AuthGuard } from "@/components/AuthGuard";
import { RegistrationConfigClient } from "@/components/club-registration-config/RegistrationConfigClient";
import { USER_ROLES } from "@/lib/auth/roles";

export default function ParametrageInscriptionPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <RegistrationConfigClient />
    </AuthGuard>
  );
}
