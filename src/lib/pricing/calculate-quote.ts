import { normalizeCompetitionIds } from "@/lib/club-registration/competition-ids";
import {
  COMPETITION_LABELS,
  COMPETITION_PRICE_CENTS,
  FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS,
  FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS,
} from "./catalog/sqyping-2025";
import { resolveBaseRates } from "./resolve-base-rates";
import {
  PRICING_CATALOG_VERSION,
  type PriceLine,
  type PriceQuote,
  type PricingContext,
} from "./types";

const PENDING_AID_REDUCTION_IDS = new Set([
  "pass_sport",
  "pass_plus",
  "labaz",
  "aide_municipale",
]);

function sumLines(lines: PriceLine[]): number {
  return lines.reduce((acc, line) => acc + line.amountCents, 0);
}

function buildMembershipDiscountLines(
  ctx: PricingContext,
  membershipCents: number
): PriceLine[] {
  const lines: PriceLine[] = [];
  let remainingMembership = membershipCents;

  const familyDiscount =
    FAMILY_DISCOUNT_ON_MEMBERSHIP_CENTS[ctx.familyRegistrationOrder] ?? 0;
  if (familyDiscount > 0) {
    const applied = Math.min(familyDiscount, remainingMembership);
    if (applied > 0) {
      const label =
        ctx.familyRegistrationOrder === "second"
          ? "Réduction — 2ᵉ adhérent de la famille"
          : "Réduction — 3ᵉ adhérent (ou plus) de la famille";
      lines.push({
        id: `discount_family_${ctx.familyRegistrationOrder}`,
        kind: "discount_family",
        label,
        amountCents: -applied,
        source: "catalog",
      });
      remainingMembership -= applied;
    }
  }

  if (
    ctx.sex === "female" &&
    ctx.firstFemaleRegistrationSqy === true &&
    remainingMembership > 0
  ) {
    const applied = Math.min(
      FEMALE_FIRST_MEMBERSHIP_DISCOUNT_CENTS,
      remainingMembership
    );
    if (applied > 0) {
      lines.push({
        id: "discount_female_first",
        kind: "discount_female_first",
        label: "Réduction — 1ʳᵉ inscription féminine au club",
        amountCents: -applied,
        source: "catalog",
      });
    }
  }

  return lines;
}

function buildCompetitionLines(competitionIds: string[]): {
  lines: PriceLine[];
  warnings: string[];
} {
  const lines: PriceLine[] = [];
  const warnings: string[] = [];

  for (const id of normalizeCompetitionIds(competitionIds)) {
    if (!(id in COMPETITION_PRICE_CENTS)) {
      warnings.push(`Compétition inconnue ignorée pour le tarif : ${id}`);
      continue;
    }
    const amountCents = COMPETITION_PRICE_CENTS[id] ?? 0;
    if (amountCents <= 0) {
      continue;
    }
    lines.push({
      id: `competition_${id}`,
      kind: "competition",
      label: COMPETITION_LABELS[id] ?? id,
      amountCents,
      source: "catalog",
      metadata: { competitionId: id },
    });
  }

  return { lines, warnings };
}

function collectAidWarnings(reductionTypes: string[] | undefined): {
  warnings: string[];
  requiresAdminReview: boolean;
} {
  const warnings: string[] = [];
  let requiresAdminReview = false;

  for (const id of reductionTypes ?? []) {
    if (PENDING_AID_REDUCTION_IDS.has(id)) {
      requiresAdminReview = true;
      warnings.push(
        "Une aide ou réduction déclarée (Pass Sport, Labaz, etc.) sera validée par le secrétariat — non incluse dans l'estimation."
      );
    }
  }

  return { warnings, requiresAdminReview };
}

/**
 * Calcule un devis à partir du contexte d'inscription (fonction pure, reproductible).
 */
export function calculateQuote(ctx: PricingContext): PriceQuote {
  const warnings: string[] = [];
  let requiresAdminReview = false;

  const aid = collectAidWarnings(ctx.reductionTypes);
  warnings.push(...aid.warnings);
  requiresAdminReview = requiresAdminReview || aid.requiresAdminReview;

  const base = resolveBaseRates(ctx);
  if (!base.ok) {
    return {
      catalogVersion: PRICING_CATALOG_VERSION,
      segmentLabel: "—",
      lines: [],
      subtotalCents: 0,
      totalCents: 0,
      warnings: [...warnings, base.warning],
      requiresAdminReview: true,
    };
  }

  const { rates } = base;
  const lines: PriceLine[] = [
    {
      id: "membership",
      kind: "membership",
      label: "Adhésion club",
      amountCents: rates.membershipCents,
      source: "catalog",
    },
    {
      id: "fftt_license",
      kind: "fftt_license",
      label: "Licence FFTT",
      amountCents: rates.licenseCents,
      source: "catalog",
    },
  ];

  if (
    ctx.wantsCompetitorExtras &&
    ctx.mainSectionId !== "handisport" &&
    ctx.mainSectionId !== "sport-adapte"
  ) {
    lines.push({
      id: "competitor_jersey_info",
      kind: "info",
      label: "Maillot compétiteur inclus (renouvellement tous les deux ans)",
      amountCents: 0,
      source: "catalog",
    });
  }

  const competitions = buildCompetitionLines(ctx.competitionIds);
  lines.push(...competitions.lines);
  warnings.push(...competitions.warnings);

  lines.push(...buildMembershipDiscountLines(ctx, rates.membershipCents));

  const subtotalCents = sumLines(
    lines.filter((l) => l.kind !== "info" && l.amountCents > 0)
  );
  const totalCents = sumLines(lines.filter((l) => l.kind !== "info"));

  return {
    catalogVersion: PRICING_CATALOG_VERSION,
    segmentLabel: rates.segmentLabel,
    lines,
    subtotalCents,
    totalCents: Math.max(0, totalCents),
    warnings: [...new Set(warnings)],
    requiresAdminReview,
  };
}
