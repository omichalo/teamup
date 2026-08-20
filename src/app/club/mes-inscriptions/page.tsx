import { MesInscriptionsClient } from "@/components/club-registration/MesInscriptionsClient";
import { AuthGuard } from "@/components/AuthGuard";
import { ALL_USER_ROLES } from "@/lib/auth/roles";

/**
 * Liste des dossiers d'inscription du soumettant connecté.
 *
 * Accessible à tout compte authentifié — la création d'un dossier
 * étant publique (parcours hybride), la liste personnelle l'est
 * mécaniquement à tout compte authentifié.
 */
export default function MesInscriptionsPage() {
  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]}>
      <MesInscriptionsClient />
    </AuthGuard>
  );
}
