import { AuthGuard } from "@/components/AuthGuard";
import { CampCatalogClient } from "@/components/camps/CampCatalogClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Catalogue stages");

export default function ClubStagesCatalogPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampCatalogClient />
    </AuthGuard>
  );
}
