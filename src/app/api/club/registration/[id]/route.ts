export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";

/**
 * La suppression définitive de dossier n'est plus supportée.
 * Utiliser POST /api/club/registration/[id]/cancel.
 */
export async function DELETE() {
  return jsonNoStore(
    {
      error:
        "La suppression de dossier n'est plus disponible. Utilisez l'annulation avec motif.",
      code: "DELETE_DISABLED",
    },
    { status: 405 }
  );
}
