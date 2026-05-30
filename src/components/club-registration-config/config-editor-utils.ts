/** Conversion affichage euros ↔ stockage centimes. */
export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function euroInputToCents(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Identifiant technique stable à la création (non modifiable ensuite). */
export function generateConfigItemId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}
