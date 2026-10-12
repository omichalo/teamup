import type { CampPricingMode } from "./constants";
import type { CampPricingLine, CampPricingQuote, CampPricingRates, CampSlot } from "./types";

/**
 * Calcule le devis stage selon le mode de tarification de la formule :
 * - session : sessions unitaires + forfait 2 sessions même jour
 * - day_week : journées / semaines
 */
export function computeCampPricingQuote(params: {
  pricing: CampPricingRates;
  isClubMember: boolean;
  pricingMode: CampPricingMode;
  slots: readonly CampSlot[];
  nowIso?: string;
}): CampPricingQuote {
  const { pricing, isClubMember, pricingMode, slots } = params;
  const nowIso = params.nowIso ?? new Date().toISOString();
  const lines: CampPricingLine[] = [];

  if (slots.length === 0) {
    return { currency: "EUR", isClubMember, lines, totalCents: 0, computedAt: nowIso };
  }

  if (pricingMode === "session") {
    const byDate = new Map<string, number>();
    for (const slot of slots) {
      byDate.set(slot.date, (byDate.get(slot.date) ?? 0) + 1);
    }
    let sessionCount = 0;
    let twoSessionBundles = 0;
    for (const count of byDate.values()) {
      if (count >= 2) {
        twoSessionBundles += 1;
        sessionCount += count - 2;
      } else {
        sessionCount += count;
      }
    }
    if (twoSessionBundles > 0) {
      lines.push({
        kind: "two_sessions",
        label: "2 sessions (même journée)",
        quantity: twoSessionBundles,
        unitCents: pricing.twoSessionsSameDayCents,
        totalCents: twoSessionBundles * pricing.twoSessionsSameDayCents,
      });
    }
    if (sessionCount > 0) {
      lines.push({
        kind: "session",
        label: "Session",
        quantity: sessionCount,
        unitCents: pricing.session2hCents,
        totalCents: sessionCount * pricing.session2hCents,
      });
    }
  } else {
    const uniqueDates = new Set(slots.map((s) => s.date));
    const dayCount = uniqueDates.size;
    const dayCents = isClubMember ? pricing.memberDayCents : pricing.nonMemberDayCents;
    const weekCents = isClubMember ? pricing.memberWeekCents : pricing.nonMemberWeekCents;

    if (dayCount >= 5) {
      const weeks = Math.floor(dayCount / 5);
      const remDays = dayCount % 5;
      lines.push({
        kind: "week",
        label: isClubMember ? "Semaine (adhérent)" : "Semaine (non-adhérent)",
        quantity: weeks,
        unitCents: weekCents,
        totalCents: weeks * weekCents,
      });
      if (remDays > 0) {
        lines.push({
          kind: "day",
          label: isClubMember ? "Journée (adhérent)" : "Journée (non-adhérent)",
          quantity: remDays,
          unitCents: dayCents,
          totalCents: remDays * dayCents,
        });
      }
    } else {
      lines.push({
        kind: "day",
        label: isClubMember ? "Journée (adhérent)" : "Journée (non-adhérent)",
        quantity: dayCount,
        unitCents: dayCents,
        totalCents: dayCount * dayCents,
      });
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  return { currency: "EUR", isClubMember, lines, totalCents, computedAt: nowIso };
}
