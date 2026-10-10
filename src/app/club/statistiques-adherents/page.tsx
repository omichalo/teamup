import { AuthGuard } from "@/components/AuthGuard";
import { RegistrationAnalyticsClient } from "@/components/club-registration/analytics/RegistrationAnalyticsClient";
import { CLUB_REGISTRATION_SPREADSHEET_ROLES } from "@/lib/club-registration/registration-access";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Statistiques adhérents");

export default function StatistiquesAdherentsPage() {
  return (
    <AuthGuard
      allowedRoles={[...CLUB_REGISTRATION_SPREADSHEET_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <RegistrationAnalyticsClient />
    </AuthGuard>
  );
}
