import { AuthGuard } from "@/components/AuthGuard";
import { CampDetailClient } from "@/components/camps/CampDetailClient";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Détail stage");

type Props = { params: Promise<{ campId: string }> };

export default async function ClubStageDetailPage({ params }: Props) {
  const { campId } = await params;
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampDetailClient campId={campId} />
    </AuthGuard>
  );
}
