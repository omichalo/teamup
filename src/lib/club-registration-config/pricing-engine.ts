import { computeAgeAt } from "@/lib/club-registration/age";
import type { PriceLine, PriceQuote, PricingContext } from "@/lib/pricing/types";
import { getPricingProfileBehavior } from "./pricing-profiles";
import { getSectionById } from "./helpers";
import type {
  AgeBand,
  AgeBandProfile,
  DiscountRule,
  RateTableEntry,
  RegistrationConfigV1,
} from "./types";
import { normalizeCompetitionIdsFromConfig } from "./helpers";

function parsePricingDate(isoDate?: string): Date {
  if (!isoDate) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return new Date();
  const y = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const d = Number.parseInt(match[3], 10);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function sumLines(lines: PriceLine[]): number {
  return lines.reduce((acc, line) => acc + line.amountCents, 0);
}

function resolveAgeBand(
  profile: AgeBandProfile,
  birthDate: string,
  at?: string
): AgeBand | null {
  const age = computeAgeAt(birthDate, parsePricingDate(at));
  if (age === null) return null;

  for (const band of profile.bands) {
    const aboveMin = age >= band.minAge;
    const belowMax = band.maxAge === undefined || age <= band.maxAge;
    if (aboveMin && belowMax) return band;
  }

  return null;
}

type RateLookupContext = {
  pricingProfile: RegistrationConfigV1["sections"][number]["pricingProfile"];
  ageBandId?: string;
  wantsCompetitorExtras?: boolean;
};

function matchesRateEntry(match: RateTableEntry["match"], ctx: RateLookupContext): boolean {
  if (match.pricingProfile !== ctx.pricingProfile) return false;
  if (match.ageBandId !== undefined && match.ageBandId !== ctx.ageBandId) return false;
  if (
    match.wantsCompetitorExtras !== undefined &&
    match.wantsCompetitorExtras !== ctx.wantsCompetitorExtras
  ) {
    return false;
  }
  return true;
}

function resolveRatesFromConfig(
  config: RegistrationConfigV1,
  ctx: PricingContext
):
  | { ok: true; rates: { membershipCents: number; licenseCents: number; segmentLabel: string } }
  | { ok: false; warning: string } {
  const section = getSectionById(config, ctx.mainSectionId);
  if (!section) {
    return { ok: false, warning: "Section principale inconnue ou désactivée." };
  }

  const profile = config.ageBandProfiles[section.ageBandProfileId];
  if (!profile) {
    return {
      ok: false,
      warning: "Profil de tranche d'âge introuvable pour cette section.",
    };
  }

  const lookup: RateLookupContext = {
    pricingProfile: section.pricingProfile,
  };

  const behavior = getPricingProfileBehavior(config, section.pricingProfile);

  if (behavior === "handisport") {
    lookup.wantsCompetitorExtras = ctx.wantsCompetitorExtras;
    if (ctx.wantsCompetitorExtras) {
      const band = resolveAgeBand(profile, ctx.birthDate, ctx.pricingDate);
      if (!band) {
        return {
          ok: false,
          warning: "Date de naissance invalide : impossible de déterminer la tranche handisport.",
        };
      }
      lookup.ageBandId = band.id;
    }
  } else if (behavior === "sport_adapte") {
    lookup.wantsCompetitorExtras = ctx.wantsCompetitorExtras;
    const band = resolveAgeBand(profile, ctx.birthDate, ctx.pricingDate);
    if (!band) {
      return {
        ok: false,
        warning: "Date de naissance invalide : impossible de déterminer la tranche sport adapté.",
      };
    }
    lookup.ageBandId = band.id;
  } else {
    lookup.wantsCompetitorExtras = ctx.wantsCompetitorExtras;
    const band = resolveAgeBand(profile, ctx.birthDate, ctx.pricingDate);
    if (!band) {
      return {
        ok: false,
        warning: "Date de naissance invalide : impossible de déterminer la tranche d'âge.",
      };
    }
    lookup.ageBandId = band.id;
  }

  const entry = config.rateTable.find((row) => matchesRateEntry(row.match, lookup));
  if (!entry) {
    return {
      ok: false,
      warning: "Aucun tarif configuré pour cette combinaison section / âge / pratique.",
    };
  }

  return {
    ok: true,
    rates: {
      membershipCents: entry.membershipCents,
      licenseCents: entry.licenseCents,
      segmentLabel: entry.segmentLabel,
    },
  };
}

function discountRuleMatches(rule: DiscountRule, ctx: PricingContext): boolean {
  const { conditions } = rule;
  if (
    conditions.familyRegistrationOrder !== undefined &&
    ctx.familyRegistrationOrder !== conditions.familyRegistrationOrder
  ) {
    return false;
  }
  if (conditions.sex !== undefined && ctx.sex !== conditions.sex) {
    return false;
  }
  if (
    conditions.firstFemaleRegistrationSqy !== undefined &&
    ctx.firstFemaleRegistrationSqy !== conditions.firstFemaleRegistrationSqy
  ) {
    return false;
  }
  return true;
}

function buildMembershipDiscountLines(
  config: RegistrationConfigV1,
  ctx: PricingContext,
  membershipCents: number
): PriceLine[] {
  const lines: PriceLine[] = [];
  let remainingMembership = membershipCents;

  for (const rule of config.discountRules) {
    if (!discountRuleMatches(rule, ctx) || rule.amountCents <= 0) continue;
    const applied = Math.min(rule.amountCents, remainingMembership);
    if (applied <= 0) continue;
    lines.push({
      id: rule.id,
      kind: rule.stripeKind,
      label: rule.label,
      amountCents: -applied,
      source: "catalog",
    });
    remainingMembership -= applied;
  }

  return lines;
}

function buildCompetitionLines(
  config: RegistrationConfigV1,
  competitionIds: string[]
): { lines: PriceLine[]; warnings: string[] } {
  const lines: PriceLine[] = [];
  const warnings: string[] = [];
  const normalized = normalizeCompetitionIdsFromConfig(config, competitionIds);
  const bundledBillingIds = new Set(config.competitionBundles.map((b) => b.billingId));

  for (const id of normalized) {
    const bundle = config.competitionBundles.find((b) => b.billingId === id);
    if (bundle) {
      if (bundle.priceCents <= 0) continue;
      lines.push({
        id: `competition_${bundle.billingId}`,
        kind: "competition",
        label: bundle.stripeLabel,
        amountCents: bundle.priceCents,
        source: "catalog",
        metadata: { competitionId: bundle.billingId },
      });
      continue;
    }

    if (bundledBillingIds.has(id)) continue;

    const competition = config.competitions.find((c) => c.id === id && c.enabled);
    if (!competition) {
      warnings.push(`Compétition inconnue ignorée pour le tarif : ${id}`);
      continue;
    }
    if (competition.priceCents <= 0) continue;
    lines.push({
      id: `competition_${competition.id}`,
      kind: "competition",
      label: competition.stripeLabel,
      amountCents: competition.priceCents,
      source: "catalog",
      metadata: { competitionId: competition.id },
    });
  }

  return { lines, warnings };
}

function applyAidRules(
  config: RegistrationConfigV1,
  ctx: PricingContext,
  membershipCents: number
): { lines: PriceLine[]; warnings: string[]; requiresAdminReview: boolean } {
  const lines: PriceLine[] = [];
  const warnings: string[] = [];
  let requiresAdminReview = false;
  let remainingMembership = membershipCents;

  for (const aidId of ctx.reductionTypes ?? []) {
    const rule = config.aidRules.find((r) => r.id === aidId);
    if (!rule) continue;

    if (rule.effect.type === "admin_review") {
      requiresAdminReview = true;
      warnings.push(
        `Une aide ou réduction déclarée (${rule.label}) sera validée par le secrétariat — non incluse dans l'estimation automatique.`
      );
      continue;
    }

    if (rule.effect.type === "fixed_discount") {
      const applied = Math.min(rule.effect.amountCents, remainingMembership);
      if (applied > 0) {
        lines.push({
          id: `aid_${rule.id}`,
          kind: "discount_aid",
          label: `Réduction — ${rule.label}`,
          amountCents: -applied,
          source: "catalog",
        });
        remainingMembership -= applied;
      }
      continue;
    }

    if (rule.effect.type === "percentage") {
      const discount = Math.round((membershipCents * rule.effect.percent) / 100);
      const applied = Math.min(discount, remainingMembership);
      if (applied > 0) {
        lines.push({
          id: `aid_${rule.id}`,
          kind: "discount_aid",
          label: `Réduction — ${rule.label} (${rule.effect.percent} %)`,
          amountCents: -applied,
          source: "catalog",
        });
        remainingMembership -= applied;
      }
    }
  }

  return { lines, warnings, requiresAdminReview };
}

/**
 * Calcule un devis à partir du contexte et d'une configuration paramétrable.
 */
export function calculateQuoteFromConfig(
  ctx: PricingContext,
  config: RegistrationConfigV1
): PriceQuote {
  const warnings: string[] = [];
  let requiresAdminReview = false;
  const stripe = config.stripePresentation;

  const base = resolveRatesFromConfig(config, ctx);
  if (!base.ok) {
    return {
      catalogVersion: config.meta.catalogVersion,
      segmentLabel: "—",
      lines: [],
      subtotalCents: 0,
      totalCents: 0,
      warnings: [base.warning],
      requiresAdminReview: true,
    };
  }

  const { rates } = base;
  const lines: PriceLine[] = [
    {
      id: "membership",
      kind: "membership",
      label: stripe.membershipLabel,
      amountCents: rates.membershipCents,
      source: "catalog",
    },
    {
      id: "fftt_license",
      kind: "fftt_license",
      label: stripe.licenseLabel,
      amountCents: rates.licenseCents,
      source: "catalog",
    },
  ];

  const section = getSectionById(config, ctx.mainSectionId);
  if (ctx.wantsCompetitorExtras && section) {
    lines.push({
      id: "competitor_jersey_info",
      kind: "info",
      label: stripe.competitorJerseyInfoLabel,
      amountCents: 0,
      source: "catalog",
    });
  }

  const competitions = buildCompetitionLines(config, ctx.competitionIds);
  lines.push(...competitions.lines);
  warnings.push(...competitions.warnings);

  lines.push(...buildMembershipDiscountLines(config, ctx, rates.membershipCents));

  const aids = applyAidRules(config, ctx, rates.membershipCents);
  lines.push(...aids.lines);
  warnings.push(...aids.warnings);
  requiresAdminReview = requiresAdminReview || aids.requiresAdminReview;

  const subtotalCents = sumLines(
    lines.filter((l) => l.kind !== "info" && l.amountCents > 0)
  );
  const totalCents = sumLines(lines.filter((l) => l.kind !== "info"));

  return {
    catalogVersion: config.meta.catalogVersion,
    segmentLabel: rates.segmentLabel,
    lines,
    subtotalCents,
    totalCents: Math.max(0, totalCents),
    warnings: [...new Set(warnings)],
    requiresAdminReview,
  };
}
