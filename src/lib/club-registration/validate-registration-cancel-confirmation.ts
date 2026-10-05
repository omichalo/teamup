import { formatPersonDisplayName } from "@/lib/shared/person-name-format";

export type RegistrationCancelIdentity = {
  firstName: string;
  lastName: string;
};

/** Normalise une saisie de confirmation (casse, espaces, accents). */
export function normalizeRegistrationCancelConfirmationInput(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("fr-FR");
}

/** Phrase à recopier pour confirmer l'annulation définitive d'un dossier. */
export function getRegistrationCancelConfirmationPhrase(
  identity: RegistrationCancelIdentity
): string {
  const name = formatPersonDisplayName(identity.firstName, identity.lastName);
  return `ANNULER ${name}`;
}

export function isRegistrationCancelConfirmationValid(
  identity: RegistrationCancelIdentity,
  confirmationPhrase: unknown
): boolean {
  if (typeof confirmationPhrase !== "string") return false;
  const expected = normalizeRegistrationCancelConfirmationInput(
    getRegistrationCancelConfirmationPhrase(identity)
  );
  const actual = normalizeRegistrationCancelConfirmationInput(confirmationPhrase);
  return actual === expected;
}

export const CANCELLATION_REASON_MAX_LENGTH = 500;

export function normalizeCancellationReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CANCELLATION_REASON_MAX_LENGTH) return null;
  return trimmed;
}
