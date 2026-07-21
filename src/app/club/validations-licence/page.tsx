import { AuthGuard } from "@/components/AuthGuard";
import { LicenseValidationsContainer } from "@/app/club/validations-licence/_containers/LicenseValidationsContainer";
import { USER_ROLES } from "@/lib/auth/roles";

export default function ValidationsLicencePage() {
  return (
    <AuthGuard
      allowedRoles={[
        USER_ROLES.ASSISTANT_SECRETARY,
        USER_ROLES.SECRETARY,
        USER_ROLES.ADMIN,
      ]}
      redirectWhenUnauthorized="/joueur"
    >
      <LicenseValidationsContainer />
    </AuthGuard>
  );
}
