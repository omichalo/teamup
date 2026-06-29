/** Normalise un fragment de nom pour comparaison souple (casse, accents, espaces). */
export function normalizeIdentityToken(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("fr-FR");
}

export type FfttIdentityComparable = {
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
};

export type DeclaredSex = "" | "female" | "male" | "other";

const SEX_LABELS: Record<DeclaredSex, string> = {
  "": "—",
  female: "Femme",
  male: "Homme",
  other: "Autre / Ne pas préciser",
};

export function sexFromFfttIsHomme(isHomme: boolean): "male" | "female" {
  return isHomme ? "male" : "female";
}

export function formatDeclaredSexLabel(sex: DeclaredSex): string {
  return SEX_LABELS[sex];
}

export function hasFfttSexMismatch(
  declaredSex: DeclaredSex,
  isHomme: boolean | undefined
): boolean {
  if (!declaredSex || isHomme === undefined) return false;
  return declaredSex !== sexFromFfttIsHomme(isHomme);
}

export function hasFfttIdentityMismatch(
  declared: FfttIdentityComparable,
  fftt: FfttIdentityComparable
): boolean {
  const declaredFirst = (declared.firstName ?? "").trim();
  const declaredLast = (declared.lastName ?? "").trim();
  const ffttFirst = (fftt.firstName ?? "").trim();
  const ffttLast = (fftt.lastName ?? "").trim();

  if (!ffttFirst && !ffttLast) return false;
  if (!declaredFirst && !declaredLast) return false;

  const firstMismatch =
    Boolean(ffttFirst && declaredFirst) &&
    normalizeIdentityToken(declaredFirst) !== normalizeIdentityToken(ffttFirst);
  const lastMismatch =
    Boolean(ffttLast && declaredLast) &&
    normalizeIdentityToken(declaredLast) !== normalizeIdentityToken(ffttLast);

  return firstMismatch || lastMismatch;
}

export function formatFfttIdentityLabel(identity: FfttIdentityComparable): string {
  return [(identity.firstName ?? "").trim(), (identity.lastName ?? "").trim()]
    .filter(Boolean)
    .join(" ");
}
