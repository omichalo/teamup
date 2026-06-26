import { AuthGuard } from "@/components/AuthGuard";
import { SuggestionsClient } from "@/components/app-suggestions/SuggestionsClient";
import { USER_ROLES } from "@/lib/auth/roles";

export default function ClubIdeesPage() {
  return (
    <AuthGuard
      allowedRoles={[
        USER_ROLES.ADMIN,
        USER_ROLES.SECRETARY,
        USER_ROLES.COACH,
      ]}
      redirectWhenUnauthorized="/joueur"
    >
      <SuggestionsClient />
    </AuthGuard>
  );
}
