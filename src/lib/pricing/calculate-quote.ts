import { calculateQuoteFromConfig } from "@/lib/club-registration-config/pricing-engine";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { PriceQuote, PricingContext } from "./types";

/**
 * Calcule un devis à partir du contexte d'inscription (fonction pure, reproductible).
 * Utilise la configuration fournie ou la config par défaut (seed).
 */
export function calculateQuote(
  ctx: PricingContext,
  config?: RegistrationConfigV1
): PriceQuote {
  return calculateQuoteFromConfig(ctx, config ?? getDefaultRegistrationConfig());
}
