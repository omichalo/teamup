import { AuthGuard } from "@/components/AuthGuard";
import { CampTableauClient } from "@/components/camps/CampTableauClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Tableau des stages");

export default function CampTableauPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampTableauClient />
    </AuthGuard>
  );
}
