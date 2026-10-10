import { AuthGuard } from "@/components/AuthGuard";
import { AccountingExportClient } from "@/components/club-registration/accounting-export/AccountingExportClient";
import { CLUB_REGISTRATION_MANAGER_ROLES } from "@/lib/club-registration/registration-access";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Export comptable");

export default function ExportComptablePage() {
  return (
    <AuthGuard
      allowedRoles={[...CLUB_REGISTRATION_MANAGER_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <AccountingExportClient />
    </AuthGuard>
  );
}
