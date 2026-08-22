const FFTT_LICENSE_RE = /^[0-9]{5,12}$/;
const REGISTRATION_KEY_PREFIX = "reg_";
const TEMPORARY_KEY_PREFIX = "tmp_";

export function digitsLicense(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value)).replace(/\D/g, "");
  }
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\D/g, "");
}

export function isFfttLicensePersonKey(value: string): boolean {
  return FFTT_LICENSE_RE.test(value);
}

export function registrationPersonKey(registrationId: string): string {
  return `${REGISTRATION_KEY_PREFIX}${registrationId}`;
}

export function parseRegistrationPersonKey(personKey: string): string | null {
  if (!personKey.startsWith(REGISTRATION_KEY_PREFIX)) {
    return null;
  }
  const id = personKey.slice(REGISTRATION_KEY_PREFIX.length);
  return id.length > 0 ? id : null;
}

/** Licence FFTT si connue, sinon `reg_{registrationId}`. */
export function resolveChampionshipPersonKey(params: {
  ffttLicense?: string | null;
  registrationId?: string | null;
}): string | null {
  const license = digitsLicense(params.ffttLicense);
  if (FFTT_LICENSE_RE.test(license)) {
    return license;
  }
  if (params.registrationId && params.registrationId.trim().length > 0) {
    return registrationPersonKey(params.registrationId.trim());
  }
  return null;
}

export function temporaryPersonKey(license?: string | null): string {
  const licenseKey = digitsLicense(license);
  if (FFTT_LICENSE_RE.test(licenseKey)) {
    return licenseKey;
  }
  return `${TEMPORARY_KEY_PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function sanitizeSeasonLabel(seasonLabel: string): string {
  const trimmed = seasonLabel.trim();
  if (!trimmed) {
    throw new Error("Libellé de saison manquant");
  }
  return trimmed.replace(/[/#]/g, "-");
}
