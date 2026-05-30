import { isMinorAt } from "./age";

type AdherentRole = "self" | "minor_dependent" | "other_adult";

/** Préremplissage e-mail adhérent depuis le compte connecté (inscription pour soi, majeur). */
export function shouldAutofillAdherentEmailFromAccount(options: {
  isRegistrationManager: boolean;
  adherentRole: AdherentRole;
  birthDate: string;
}): boolean {
  if (options.isRegistrationManager) return false;
  if (options.adherentRole !== "self") return false;
  return !isMinorAt(options.birthDate);
}

/** Préremplissage e-mail représentant légal depuis le compte connecté. */
export function shouldAutofillRepresentativeEmailFromAccount(options: {
  isRegistrationManager: boolean;
  adherentRole: AdherentRole;
}): boolean {
  if (options.isRegistrationManager) return false;
  return options.adherentRole === "minor_dependent";
}

/** Retire l'e-mail du compte connecté de l'e-mail adhérent (mineur ou staff). */
export function shouldClearAdherentEmailFromAccount(options: {
  isRegistrationManager: boolean;
  adherentRole: AdherentRole;
  birthDate: string;
}): boolean {
  if (options.isRegistrationManager) return true;
  if (options.adherentRole === "minor_dependent") return true;
  return options.adherentRole === "self" && isMinorAt(options.birthDate);
}

/** Retire l'e-mail du compte connecté de l'e-mail représentant (staff uniquement). */
export function shouldClearRepresentativeEmailFromAccount(options: {
  isRegistrationManager: boolean;
}): boolean {
  return options.isRegistrationManager;
}
