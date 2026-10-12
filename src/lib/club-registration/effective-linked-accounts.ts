/**
 * Comptes autorisés au portail (Mes inscriptions, factures, checkout).
 * - `linkedAccountUids` défini (y compris []) → liste exclusive
 * - absent → legacy : accès = [submitterUid]
 */
export function effectiveLinkedAccountUids(data: {
  linkedAccountUids?: unknown;
  submitterUid?: unknown;
}): string[] {
  if (Array.isArray(data.linkedAccountUids)) {
    return data.linkedAccountUids.filter(
      (uid): uid is string => typeof uid === "string" && uid.trim().length > 0
    );
  }
  if (typeof data.submitterUid === "string" && data.submitterUid.trim().length > 0) {
    return [data.submitterUid.trim()];
  }
  return [];
}

/** E-mails des comptes qui peuvent accéder en ligne (affichage / recherche). */
export function effectiveLinkedAccountEmails(data: {
  linkedAccountEmails?: unknown;
  linkedAccountUids?: unknown;
  submitterAccountEmail?: unknown;
  submitterUid?: unknown;
}): string[] {
  if (Array.isArray(data.linkedAccountEmails)) {
    const emails = data.linkedAccountEmails.filter(
      (email): email is string =>
        typeof email === "string" && email.includes("@")
    );
    if (emails.length > 0) {
      return emails.map((email) => email.trim());
    }
  }
  // Legacy ou snapshot e-mail manquant : e-mail du compte qui a créé le dossier
  // tant qu'il fait encore partie des comptes d'accès effectifs.
  const accessUids = effectiveLinkedAccountUids(data);
  const submitterUid =
    typeof data.submitterUid === "string" ? data.submitterUid.trim() : "";
  if (
    submitterUid &&
    accessUids.includes(submitterUid) &&
    typeof data.submitterAccountEmail === "string" &&
    data.submitterAccountEmail.includes("@")
  ) {
    return [data.submitterAccountEmail.trim()];
  }
  return [];
}

export function isLinkedAccountOwner(
  linkedAccountUids: string[],
  requestUid: string
): boolean {
  return (
    typeof requestUid === "string" &&
    requestUid.length > 0 &&
    linkedAccountUids.includes(requestUid)
  );
}
