import { AuthGuard } from "@/components/AuthGuard";
import { SuggestionsClient } from "@/components/app-suggestions/SuggestionsClient";
import { ALL_USER_ROLES } from "@/lib/auth/roles";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Boîte à idées");

export default function ClubIdeesPage() {
  return (
    <AuthGuard
      allowedRoles={[...ALL_USER_ROLES]}
      redirectWhenUnauthorized="/login"
    >
      <SuggestionsClient />
    </AuthGuard>
  );
}
