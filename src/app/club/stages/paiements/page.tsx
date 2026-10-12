import { AuthGuard } from "@/components/AuthGuard";
import { CampPaymentsClient } from "@/components/camps/CampPaymentsClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Paiements stages");

export default function CampPaymentsPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampPaymentsClient />
    </AuthGuard>
  );
}
