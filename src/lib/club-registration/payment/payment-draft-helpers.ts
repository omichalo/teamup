import type { PaymentAid } from "./types";

export function normalizePaymentAidList(
  aids: Array<{
    type: string;
    label: string;
    amountCents: number;
    reference?: string | undefined;
    note?: string | undefined;
  }>
): PaymentAid[] {
  return aids.map((aid) => {
    const normalized: PaymentAid = {
      type: aid.type,
      label: aid.label,
      amountCents: aid.amountCents,
    };
    if (aid.reference) normalized.reference = aid.reference;
    if (aid.note) normalized.note = aid.note;
    return normalized;
  });
}

/** Convertit une saisie euros (virgule ou point) en centimes. */
export function eurosInputToCents(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || normalized === ".") return 0;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Nettoie la saisie d'un montant en euros pendant la frappe (virgule française,
 * au plus deux décimales).
 */
export function sanitizeEurosMonetaryInput(raw: string): string {
  const s = raw.replace(/\s/g, "").replace(/\./g, ",");
  const comma = s.indexOf(",");
  if (comma === -1) {
    return s.replace(/[^\d]/g, "");
  }
  const int = s.slice(0, comma).replace(/[^\d]/g, "");
  const frac = s.slice(comma + 1).replace(/[^\d]/g, "").slice(0, 2);
  if (frac.length > 0) {
    return (int === "" ? "0" : int) + "," + frac;
  }
  return int + ",";
}

/** Affiche des centimes dans un champ texte euros. */
export function centsToEurosInput(amountCents: number): string {
  if (amountCents <= 0) return "";
  return (amountCents / 100).toFixed(2).replace(".", ",");
}

export function findPaymentAid(aids: PaymentAid[], type: string): PaymentAid | undefined {
  return aids.find((a) => a.type === type);
}

export type UpsertPaymentAidOptions = {
  /**
   * Si vrai, conserve la ligne même avec montant 0 et sans note/référence
   * (édition au clavier ou case cochée sans montant encore saisi).
   */
  retainZero?: boolean;
};

export function upsertPaymentAid(
  aids: PaymentAid[],
  patch: PaymentAid,
  options?: UpsertPaymentAidOptions
): PaymentAid[] {
  const without = aids.filter((a) => a.type !== patch.type);
  const retainZero = options?.retainZero === true;
  if (
    retainZero ||
    patch.amountCents > 0 ||
    patch.note?.trim() ||
    patch.reference?.trim()
  ) {
    const next: PaymentAid = {
      type: patch.type,
      label: patch.label,
      amountCents: patch.amountCents,
    };
    if (patch.reference?.trim()) next.reference = patch.reference.trim();
    if (patch.note?.trim()) next.note = patch.note.trim();
    return [...without, next];
  }
  return without;
}

export function removePaymentAid(aids: PaymentAid[], type: string): PaymentAid[] {
  return aids.filter((a) => a.type !== type);
}

/** Garde les lignes d’aide alignées sur les cases cochées (+ « autre »). */
export function syncPaymentAidsWithReductionTypes(
  paymentAids: PaymentAid[],
  reductionTypes: string[],
  labelsByType: Record<string, string>
): PaymentAid[] {
  let next = paymentAids.filter(
    (a) => a.type === "other" || reductionTypes.includes(a.type)
  );

  for (const type of reductionTypes) {
    if (next.some((a) => a.type === type)) continue;
    next = upsertPaymentAid(
      next,
      {
        type,
        label: labelsByType[type] ?? type,
        amountCents: 0,
      },
      { retainZero: true }
    );
  }

  return next;
}
