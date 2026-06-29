import { formatPersonDisplayName } from "@/lib/shared/person-name-format";

export type RegistrationDeleteIdentity = {
  firstName: string;
  lastName: string;
};

/** Normalise une saisie de confirmation (casse, espaces, accents). */
export function normalizeRegistrationDeleteConfirmationInput(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("fr-FR");
}

/** Phrase à recopier pour confirmer la suppression définitive d'un dossier. */
export function getRegistrationDeleteConfirmationPhrase(
  identity: RegistrationDeleteIdentity
): string {
  const name = formatPersonDisplayName(identity.firstName, identity.lastName);
  return `SUPPRIMER ${name}`;
}

export function isRegistrationDeleteConfirmationValid(
  identity: RegistrationDeleteIdentity,
  confirmationPhrase: unknown
): boolean {
  if (typeof confirmationPhrase !== "string") return false;
  const expected = normalizeRegistrationDeleteConfirmationInput(
    getRegistrationDeleteConfirmationPhrase(identity)
  );
  const actual = normalizeRegistrationDeleteConfirmationInput(confirmationPhrase);
  return actual === expected;
}
