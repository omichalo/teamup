import { AuthGuard } from "@/components/AuthGuard";
import { CampStatsClient } from "@/components/camps/CampStatsClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Statistiques stages");

export default function CampStatistiquesPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampStatsClient />
    </AuthGuard>
  );
}
