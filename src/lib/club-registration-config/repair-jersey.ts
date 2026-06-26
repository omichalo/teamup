import type { JerseyCatalogConfig, RegistrationConfigV1 } from "./types";

export const DEFAULT_JERSEY_CATALOG: JerseyCatalogConfig = {
  optionalPriceCents: 3_500,
  optionalStripeLabel: "Maillot de compétition",
};

export const DEFAULT_COMPETITOR_JERSEY_HELPER =
  "Le maillot est obligatoire. Son prix (15 €) est inclus dans votre adhésion compétiteur.";

export const DEFAULT_JERSEY_SIZE_HELPER =
  "Le maillot proposé est un modèle garçon (coupe masculine).";

export const DEFAULT_OPTIONAL_JERSEY_OPT_IN_LABEL =
  "Je souhaite commander un maillot de compétition";

/** Complète la config maillot pour les exports antérieurs à l'introduction du bloc `jersey`. */
export function repairJerseyConfig(config: RegistrationConfigV1): RegistrationConfigV1 {
  return {
    ...config,
    jersey: {
      optionalPriceCents:
        config.jersey?.optionalPriceCents ?? DEFAULT_JERSEY_CATALOG.optionalPriceCents,
      optionalStripeLabel:
        config.jersey?.optionalStripeLabel ?? DEFAULT_JERSEY_CATALOG.optionalStripeLabel,
    },
    uiCopy: {
      ...config.uiCopy,
      competitorJerseyHelper:
        config.uiCopy.competitorJerseyHelper ?? DEFAULT_COMPETITOR_JERSEY_HELPER,
      jerseySizeHelper: config.uiCopy.jerseySizeHelper ?? DEFAULT_JERSEY_SIZE_HELPER,
      optionalJerseyOptInLabel:
        config.uiCopy.optionalJerseyOptInLabel ?? DEFAULT_OPTIONAL_JERSEY_OPT_IN_LABEL,
    },
  };
}
