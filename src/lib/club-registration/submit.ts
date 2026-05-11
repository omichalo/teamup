import type { ClubRegistrationPayload } from "./schema";

export type SubmitResult =
  | { ok: true; id: string }
  | {
      ok: false;
      status: number;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

/**
 * Soumet un dossier d'inscription au club via `POST /api/club/registration`.
 *
 * Le serveur vérifie l'authentification via le cookie de session ; le client
 * s'assure simplement d'inclure les credentials. La validation Zod est faite
 * côté serveur (et déjà côté client avant l'appel).
 *
 * Retourne un objet discriminé pour permettre au composant appelant de
 * distinguer succès / erreur sans throw (UX moins brutale).
 */
export async function submitRegistration(
  payload: ClubRegistrationPayload
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/club/registration", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Connexion impossible avec le serveur. Vérifiez votre réseau.",
    };
  }

  let json: unknown = {};
  try {
    json = await res.json();
  } catch {
    /* Body non JSON : on continue avec un objet vide. */
  }

  if (res.ok) {
    const j = json as { id?: string };
    if (typeof j.id === "string" && j.id.length > 0) {
      return { ok: true, id: j.id };
    }
    return {
      ok: false,
      status: res.status,
      error: "Réponse serveur inattendue (identifiant manquant).",
    };
  }

  const j = json as {
    error?: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
  return {
    ok: false,
    status: res.status,
    error: j.error || `Erreur serveur (${res.status})`,
    ...(j.fieldErrors ? { fieldErrors: j.fieldErrors } : {}),
  };
}
