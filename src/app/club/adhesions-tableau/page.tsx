import { AuthGuard } from "@/components/AuthGuard";
import { RegistrationsSpreadsheetClient } from "@/components/club-registration/spreadsheet/RegistrationsSpreadsheetClient";
import { USER_ROLES } from "@/lib/auth/roles";

export default function AdhesionsTableauPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.SECRETARY, USER_ROLES.ADMIN]}
      redirectWhenUnauthorized="/joueur"
    >
      <RegistrationsSpreadsheetClient />
    </AuthGuard>
  );
}
