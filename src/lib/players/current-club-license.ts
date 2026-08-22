/**
 * Current-season club licence = FFTT details type T/P/A.
 * `getJoueursByClub` can still list SQY affiliates with a null type (no season licence).
 */

export type ClubLicenseInput = {
  listedInClub?: boolean | null;
  license?: string | null;
  typeLicence?: string | null;
};

export function typeLicenceFromFfttDetails(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isPlayableLicenseType(
  typeLicence: string | null | undefined
): boolean {
  const type = (typeLicence ?? "").trim().toUpperCase();
  return type === "T" || type === "P" || type === "A";
}

export function currentClubLicenseFields(input: ClubLicenseInput): {
  isActive: boolean;
  typeLicence: string;
} {
  const listedInClub = input.listedInClub === true;
  const rawType = typeLicenceFromFfttDetails(input.typeLicence);
  const typeLicence =
    listedInClub && isPlayableLicenseType(rawType) ? rawType : "";
  return {
    typeLicence,
    isActive:
      listedInClub &&
      Boolean((input.license ?? "").trim()) &&
      isPlayableLicenseType(rawType),
  };
}
