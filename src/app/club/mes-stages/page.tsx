import { AuthGuard } from "@/components/AuthGuard";
import { MesStagesClient } from "@/components/camps/MesStagesClient";
import { ALL_USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Mes stages");

export default function MesStagesPage() {
  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]} redirectWhenUnauthorized="/login">
      <MesStagesClient />
    </AuthGuard>
  );
}
