import { AuthGuard } from "@/components/AuthGuard";
import { SuggestionsClient } from "@/components/app-suggestions/SuggestionsClient";
import { ALL_USER_ROLES } from "@/lib/auth/roles";

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
