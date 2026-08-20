import { buildManagedTreatQueueHref } from "@/lib/club-registration/managed-queue-summary";

/** Lien direct vers un dossier dans l’interface secrétariat / admin. */
export function buildRegistrationManagerDetailUrl(
  appOrigin: string,
  registrationId: string
): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}${buildManagedTreatQueueHref(registrationId)}`;
}
