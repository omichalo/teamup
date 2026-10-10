import { AuthGuard } from "@/components/AuthGuard";
import { RegistrationsSpreadsheetClient } from "@/components/club-registration/spreadsheet/RegistrationsSpreadsheetClient";
import { CLUB_REGISTRATION_SPREADSHEET_ROLES } from "@/lib/club-registration/registration-access";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Tableau des adhésions");

export default function AdhesionsTableauPage() {
  return (
    <AuthGuard
      allowedRoles={[...CLUB_REGISTRATION_SPREADSHEET_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <RegistrationsSpreadsheetClient />
    </AuthGuard>
  );
}
