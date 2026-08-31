/**
 * Politique de mot de passe Firebase (Identity Platform).
 * Seuls ces caractères comptent pour l'exigence « non alphanumérique » ;
 * d'autres symboles peuvent figurer dans le mot de passe sans la satisfaire.
 * @see https://firebase.google.com/docs/auth/web/password-auth
 */
export const FIREBASE_ALLOWED_SPECIAL_CHARACTERS =
  '^$*.[]{}()?"!@#%&/\\,><\':;|_~';

const FIREBASE_SPECIAL_CHARACTER_DISPLAY = [...FIREBASE_ALLOWED_SPECIAL_CHARACTERS].join(" ");

/** Libellé affiché dans la liste des exigences du mot de passe. */
export const FIREBASE_SPECIAL_CHARACTER_REQUIREMENT_LABEL =
  "Au moins un caractère spécial requis";

/** Détail affiché sous l'exigence « caractère spécial ». */
export const FIREBASE_SPECIAL_CHARACTER_HINT =
  `Seuls ces caractères comptent pour cette exigence : ${FIREBASE_SPECIAL_CHARACTER_DISPLAY}. ` +
  "Les autres (ex. +, -, =, lettres accentuées) peuvent figurer dans le mot de passe, mais ne la remplissent pas.";

/** Message d'erreur Zod / formulaire. */
export const FIREBASE_SPECIAL_CHARACTER_ERROR_MESSAGE =
  `Le mot de passe doit contenir au moins un caractère spécial parmi : ${FIREBASE_SPECIAL_CHARACTER_DISPLAY}`;

export function containsFirebaseSpecialCharacter(password: string): boolean {
  return [...password].some((char) => FIREBASE_ALLOWED_SPECIAL_CHARACTERS.includes(char));
}
