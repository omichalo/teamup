import { AuthGuard } from "@/components/AuthGuard";
import { CampRegistrationForm } from "@/components/camps/CampRegistrationForm";
import { ALL_USER_ROLES } from "@/lib/auth/roles";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Inscription stage");

type Props = { params: Promise<{ campId: string }> };

export default async function CampInscriptionPage({ params }: Props) {
  const { campId } = await params;
  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]} redirectWhenUnauthorized="/login">
      <CampRegistrationForm campId={campId} mode="self" />
    </AuthGuard>
  );
}
