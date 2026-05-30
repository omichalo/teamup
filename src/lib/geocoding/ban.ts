/**
 * Types et extraction pour l’API Adresse (Base Adresse Nationale / data.gouv).
 * https://adresse.data.gouv.fr/outils/doc/api/adresse/
 */

export type BanFeatureProperties = {
  label: string;
  score?: number;
  housenumber?: string;
  id?: string;
  name?: string;
  postcode?: string;
  citycode?: string;
  city?: string;
  street?: string;
  context?: string;
  type?: string;
};

export type BanFeature = {
  type: "Feature";
  properties: BanFeatureProperties;
};

export type BanSearchResponse = {
  type: "FeatureCollection";
  features: BanFeature[];
};

export type ParsedBanAddress = {
  /** Identifiant stable pour les options Autocomplete */
  optionId: string;
  /** Libellé affiché (properties.label) */
  label: string;
  addressLine1: string;
  postalCode: string;
  city: string;
};

function buildAddressLine1(props: BanFeatureProperties): string {
  const postcode = props.postcode?.trim() ?? "";
  const city = props.city?.trim() ?? "";
  const fromParts = [props.housenumber, props.street || props.name]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(" ")
    .trim();
  if (fromParts) return fromParts;
  if (props.label && postcode) {
    const tail = new RegExp(`\\s*${escapeRegex(postcode)}\\s*${escapeRegex(city)}\\s*$`, "i");
    const stripped = props.label.replace(tail, "").trim();
    if (stripped) return stripped;
  }
  return props.label.trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * La BAN n’alimente pas toujours postcode/city dans properties ; le libellé contient souvent « CP ville » en fin de chaîne.
 */
export function extractPostcodeCityFromLabel(label: string): { postcode: string; city: string } | null {
  const trimmed = label.trim();
  const m = trimmed.match(/(\d{5})\s+([^,]+?)\s*$/u);
  if (!m?.[1] || !m[2]) return null;
  const city = m[2].trim();
  if (city.length < 2) return null;
  return { postcode: m[1], city };
}

export function banFeatureToParsedAddress(feature: BanFeature, index: number): ParsedBanAddress | null {
  const props = feature.properties;
  let postalCode = props.postcode?.trim() ?? "";
  let city = props.city?.trim() ?? "";
  if (!postalCode || !city) {
    const fromLabel = extractPostcodeCityFromLabel(props.label?.trim() ?? "");
    if (fromLabel) {
      if (!postalCode) postalCode = fromLabel.postcode;
      if (!city) city = fromLabel.city;
    }
  }
  if (!postalCode || !city) {
    return null;
  }
  let addressLine1 = buildAddressLine1(props);
  if (!addressLine1) {
    addressLine1 = city;
  }
  const baseKey = props.id?.trim() ?? `${props.label}|${postalCode}`;
  /* Index obligatoire : la BAN peut renvoyer plusieurs entrées au même libellé / même id. */
  const optionId = `${baseKey}::__${index}`;
  return {
    optionId,
    label: props.label.trim(),
    addressLine1,
    postalCode,
    city,
  };
}
