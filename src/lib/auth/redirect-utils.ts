/**
 * Valide qu'une URL de redirection est un chemin interne sécurisé.
 * Empêche les open redirects en s'assurant que l'URL est relative et ne contient pas de protocole.
 *
 * @param url - L'URL à valider
 * @returns L'URL validée (chemin relatif) ou "/" par défaut si invalide
 */
export function validateInternalRedirect(url: string | null | undefined): string {
  if (!url || typeof url !== "string") {
    return "/";
  }

  // Supprimer les espaces et caractères de contrôle
  const trimmed = url.trim();

  // Rejeter les URLs absolues avec protocole (http://, https://, //, etc.)
  if (
    trimmed.includes("://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "/";
  }

  // S'assurer que c'est un chemin relatif qui commence par /
  if (!trimmed.startsWith("/")) {
    return "/";
  }

  // Rejeter les chemins qui tentent de sortir du répertoire racine
  // (ex: /../../../etc/passwd)
  if (trimmed.includes("..")) {
    return "/";
  }

  // Accepter les chemins valides (commençant par / et sans protocole)
  return trimmed;
}

