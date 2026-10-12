import { AuthGuard } from "@/components/AuthGuard";
import { CampRegistrationForm } from "@/components/camps/CampRegistrationForm";
import { USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Saisie inscription stage");

type Props = { params: Promise<{ campId: string }> };

export default async function CampSaisiePage({ params }: Props) {
  const { campId } = await params;
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SECRETARY]}
      redirectWhenUnauthorized="/joueur"
    >
      <CampRegistrationForm campId={campId} mode="staff" />
    </AuthGuard>
  );
}
