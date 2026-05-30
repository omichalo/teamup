import { MesInscriptionsClient } from "@/components/club-registration/MesInscriptionsClient";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";

/**
 * Liste des dossiers d'inscription du soumettant connecté.
 *
 * Accessible aux PLAYER / COACH / ADMIN — la création d'un dossier
 * étant publique (parcours hybride), la liste personnelle l'est
 * mécaniquement à tout compte authentifié.
 */
export default function MesInscriptionsPage() {
  return (
    <AuthGuard
      allowedRoles={[
        USER_ROLES.PLAYER,
        USER_ROLES.SECRETARY,
        USER_ROLES.COACH,
        USER_ROLES.ADMIN,
      ]}
    >
      <MesInscriptionsClient />
    </AuthGuard>
  );
}
