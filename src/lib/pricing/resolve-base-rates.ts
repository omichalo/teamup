import type { BaseRates } from "./catalog/sqyping-2025";
import {
  getCompetitorRates,
  getHandisportCompetitionRates,
  getHandisportLeisureRates,
  getLeisureRates,
  getSportAdapteRates,
} from "./catalog/sqyping-2025";
import type { PricingContext } from "./types";
import {
  resolveClassicAgeBand,
  resolveHandisportCompetitionAgeBand,
  resolveSportAdapteAgeBand,
} from "./resolve-age-band";

export type ResolveBaseRatesResult =
  | { ok: true; rates: BaseRates }
  | { ok: false; warning: string };

export function resolveBaseRates(ctx: PricingContext): ResolveBaseRatesResult {
  const at = ctx.pricingDate;

  if (ctx.mainSectionId === "handisport") {
    if (!ctx.wantsCompetitorExtras) {
      return { ok: true, rates: getHandisportLeisureRates() };
    }
    const ageBand = resolveHandisportCompetitionAgeBand(ctx.birthDate, at);
    if (!ageBand) {
      return {
        ok: false,
        warning: "Date de naissance invalide : impossible de déterminer la tranche handisport.",
      };
    }
    return { ok: true, rates: getHandisportCompetitionRates(ageBand) };
  }

  if (ctx.mainSectionId === "sport-adapte") {
    const ageBand = resolveSportAdapteAgeBand(ctx.birthDate, at);
    if (!ageBand) {
      return {
        ok: false,
        warning:
          "Date de naissance invalide : impossible de déterminer la tranche sport adapté.",
      };
    }
    const sportAdapteLevel = ctx.wantsCompetitorExtras ? "competitor" : "leisure";
    return {
      ok: true,
      rates: getSportAdapteRates(sportAdapteLevel, ageBand),
    };
  }

  const ageBand = resolveClassicAgeBand(ctx.birthDate, at);
  if (!ageBand) {
    return {
      ok: false,
      warning: "Date de naissance invalide : impossible de déterminer la tranche d'âge.",
    };
  }

  if (ctx.wantsCompetitorExtras) {
    return { ok: true, rates: getCompetitorRates(ageBand) };
  }
  return { ok: true, rates: getLeisureRates(ageBand) };
}
