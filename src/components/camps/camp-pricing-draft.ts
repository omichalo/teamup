export type CampPricingEurosDraft = {
  memberDay: string;
  memberWeek: string;
  nonMemberDay: string;
  nonMemberWeek: string;
  session2h: string;
  twoSessionsSameDay: string;
};

export const EMPTY_PRICING_EUROS: CampPricingEurosDraft = {
  memberDay: "",
  memberWeek: "",
  nonMemberDay: "",
  nonMemberWeek: "",
  session2h: "",
  twoSessionsSameDay: "",
};

export const ZERO_PRICING_CENTS = {
  memberDayCents: 0,
  memberWeekCents: 0,
  nonMemberDayCents: 0,
  nonMemberWeekCents: 0,
  session2hCents: 0,
  twoSessionsSameDayCents: 0,
} as const;

export function eurosToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToEurosInput(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function pricingEurosToCents(draft: CampPricingEurosDraft): {
  memberDayCents: number;
  memberWeekCents: number;
  nonMemberDayCents: number;
  nonMemberWeekCents: number;
  session2hCents: number;
  twoSessionsSameDayCents: number;
} | null {
  const memberDayCents = eurosToCents(draft.memberDay);
  const memberWeekCents = eurosToCents(draft.memberWeek);
  const nonMemberDayCents = eurosToCents(draft.nonMemberDay);
  const nonMemberWeekCents = eurosToCents(draft.nonMemberWeek);
  const session2hCents = eurosToCents(draft.session2h);
  const twoSessionsSameDayCents = eurosToCents(draft.twoSessionsSameDay);
  if (
    memberDayCents === null ||
    memberWeekCents === null ||
    nonMemberDayCents === null ||
    nonMemberWeekCents === null ||
    session2hCents === null ||
    twoSessionsSameDayCents === null
  ) {
    return null;
  }
  return {
    memberDayCents,
    memberWeekCents,
    nonMemberDayCents,
    nonMemberWeekCents,
    session2hCents,
    twoSessionsSameDayCents,
  };
}
