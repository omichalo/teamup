export type ManagedQueueSummary = {
  actionable: number;
  missingCertificate: number;
  paymentPending: number;
  paymentRequested: number;
  truncated: boolean;
};

export function buildManagedTreatQueueHref(registrationId?: string | null): string {
  const url = new URL("/club/demandes-adhesion", "http://local");
  url.searchParams.set("status", "actionable");
  if (registrationId) {
    url.searchParams.set("id", registrationId);
  }
  return `${url.pathname}${url.search}`;
}

export function buildSpreadsheetHref(options?: {
  registrationId?: string | null;
  searchQuery?: string | null;
  viewId?: string | null;
}): string {
  const url = new URL("/club/adhesions-tableau", "http://local");
  if (options?.viewId) {
    url.searchParams.set("vue", options.viewId);
  }
  if (options?.searchQuery?.trim()) {
    url.searchParams.set("q", options.searchQuery.trim());
  }
  if (options?.registrationId) {
    url.searchParams.set("dossier", options.registrationId);
  }
  return `${url.pathname}${url.search}`;
}

export function formatManagedQueueSummarySubtitle(summary: ManagedQueueSummary): string {
  const parts = [`${summary.actionable} dossier${summary.actionable > 1 ? "s" : ""} à traiter`];
  if (summary.missingCertificate > 0) {
    parts.push(
      `${summary.missingCertificate} certificat${summary.missingCertificate > 1 ? "s" : ""} attendu${summary.missingCertificate > 1 ? "s" : ""}`
    );
  }
  if (summary.paymentPending > 0) {
    parts.push(
      `${summary.paymentPending} paiement${summary.paymentPending > 1 ? "s" : ""} en cours`
    );
  }
  if (summary.truncated) {
    parts.push("(comptage partiel)");
  }
  return parts.join(" · ");
}

/** Synthèse courte pour l'en-tête de la page « Dossiers à valider ». */
export function formatManagedRequestsPageSubtitle(summary: ManagedQueueSummary): string {
  const parts = [`${summary.actionable} à traiter`];
  if (summary.missingCertificate > 0) {
    parts.push(
      `${summary.missingCertificate} certificat${summary.missingCertificate > 1 ? "s" : ""}`
    );
  }
  if (summary.paymentPending > 0) {
    parts.push(`${summary.paymentPending} paiement${summary.paymentPending > 1 ? "s" : ""}`);
  }
  if (summary.truncated) {
    parts.push("…");
  }
  return parts.join(" · ");
}
