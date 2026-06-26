import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * Retire l'e-mail du compte soumettant des champs de contact adhérent /
 * représentant (saisie secrétariat ou admin pour un tiers).
 */
export function stripSubmitterEmailFromRegistrationPayload(
  payload: ClubRegistrationPayload,
  submitterEmail: string | null | undefined
): ClubRegistrationPayload {
  const submitter = normalizeEmail(submitterEmail);
  if (!submitter.includes("@")) {
    return payload;
  }

  const stripIfMatchesSubmitter = (email: string): string =>
    normalizeEmail(email) === submitter ? "" : email;

  return {
    ...payload,
    adherentEmail: stripIfMatchesSubmitter(payload.adherentEmail ?? ""),
    representatives: payload.representatives.map((representative) => ({
      ...representative,
      email: stripIfMatchesSubmitter(representative.email),
    })),
  };
}
