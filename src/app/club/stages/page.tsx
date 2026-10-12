import { AuthGuard } from "@/components/AuthGuard";
import { CampsListClient } from "@/components/camps/CampsListClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Stages");

export default function ClubStagesPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampsListClient />
    </AuthGuard>
  );
}
